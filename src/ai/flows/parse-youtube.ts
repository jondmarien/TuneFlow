'use server';
/**
 * @fileOverview Parses YouTube comments fetched via a backend API route to identify song titles and artists.
 *
 * - parseYouTubeComment - A function that handles the comment parsing process.
 * - ParseYouTubeCommentInput - The input type for the parseYouTubeComment function.
 * - ParseYouTubeCommentOutput - The return type for the parseYouTubeComment function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import { getTrackAlbumArt } from '@/services/spotify-service';

// --- Input and Output Schemas (Unchanged) ---
const ParseYouTubeCommentInputSchema = z.object({
  youtubeUrl: z.string().describe('The YouTube video URL.'), // Updated description: Only video URL is supported now
  prioritizePinnedComments: z
    .boolean()
    .default(false)
    .describe('Whether to prioritize pinned comments (Note: Pinned status might not be available via basic commentThreads endpoint).'),
  scanDescription: z
    .boolean()
    .default(false)
    .describe('Whether to scan the video description for song and artist info.'),
});
export type ParseYouTubeCommentInput = z.infer<typeof ParseYouTubeCommentInputSchema>;

const ParseYouTubeCommentOutputSchema = z.object({
  songs: z.array(
    z.object({
      title: z.string().describe('The title of the song.'),
      artist: z.string().describe('The artist of the song.'),
      imageUrl: z.union([z.string(), z.null()]).optional().describe('URL of the album art for the song.')
    })
  ).describe('The list of songs identified in the comments.'),
});
export type ParseYouTubeCommentOutput = z.infer<typeof ParseYouTubeCommentOutputSchema>;

// --- Public Function (Unchanged) ---
export async function parseYouTubeComment(input: ParseYouTubeCommentInput): Promise<ParseYouTubeCommentOutput> {
  return parseYouTubeCommentFlow(input);
}

// --- AI Tool Definition (Unchanged) ---
const extractSongInfo = ai.defineTool({
  name: 'extractSongInfo',
  description: 'Extracts song title and artist from a given text.',
  inputSchema: z.object({
    text: z.string().describe('The text to extract song information from.'),
  }),
  outputSchema: z.object({
    title: z.string().describe('The title of the song.'),
    artist: z.string().describe('The artist of the song.'),
  }),
},
async input => {
  // Basic extraction logic
  const parts = input.text.split('-');
  if (parts.length >= 2) {
    return {
      artist: parts[0].trim(),
      title: parts[1].trim(),
    };
  } else {
    // Consider patterns like "Song Title by Artist"
    const byParts = input.text.split(/\s+by\s+/i);
    if (byParts.length === 2) {
       return {
         title: byParts[0].trim(),
         artist: byParts[1].trim(),
       };
    }
    return {
      artist: 'Unknown',
      title: input.text.trim(),
    };
  }
});

// --- AI Prompt Definition (Unchanged) ---
const parseCommentPrompt = ai.definePrompt({
  name: 'parseCommentPrompt',
  tools: [extractSongInfo],
  input: {
    schema: z.object({
      commentText: z.string().describe('The text content of the YouTube comment.'),
    }),
  },
  output: {
    schema: z.object({
      songs: z.array(
        z.object({
          title: z.string().describe('The title of the song.'),
          artist: z.string().describe('The artist of the song.'),
        })
      ).describe('The list of songs identified in the comments.'),
    }),
  },
  prompt: `You are an AI that extracts song titles and artists from YouTube comments.

  The user will provide a comment, and you will return a list of songs mentioned in the comment.

  Use the extractSongInfo tool to extract the song title and artist from the comment text. Be as accurate as possible. Look for patterns like "Artist - Title" or "Title by Artist".

  Comment: {{{commentText}}}
  `, // Ensure Handlebars syntax is used
});

// --- AI Flow Definition (UPDATED) ---
const parseYouTubeCommentFlow = ai.defineFlow<
  typeof ParseYouTubeCommentInputSchema,
  typeof ParseYouTubeCommentOutputSchema
>(
  {
    name: 'parseYouTubeCommentFlow',
    inputSchema: ParseYouTubeCommentInputSchema,
    outputSchema: ParseYouTubeCommentOutputSchema,
  },
  async input => {
    let commentsData: any[] = []; // Store raw comment items from API
    let descriptionText = '';

    // Construct the absolute URL for the internal API route
    // Use localhost and port from dev script (9002) for local development.
    // For production, use an environment variable (e.g., process.env.NEXT_PUBLIC_APP_URL)
    const internalApiBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
    const apiUrl = `${internalApiBaseUrl}/api/youtube/comments`;
    console.log(`[parseYouTubeCommentFlow] Fetching comments from internal API: ${apiUrl}`);

    // Only handle video URLs as per the current API route
    if (input.youtubeUrl.includes('watch?v=')) {
      // Ensure the URL has a protocol, add https:// if missing
      let urlStr = input.youtubeUrl;
      if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
        urlStr = 'https://' + urlStr;
      }
      const videoId = new URL(urlStr).searchParams.get('v');
      if (!videoId) {
        throw new Error('Invalid YouTube video URL: Missing video ID.');
      }

      try {
        // Call the backend API route using the absolute URL
        const fetchStart = Date.now();
        console.log(`[parseYouTubeCommentFlow] Calling fetch with videoId: ${videoId}`);
        const response = await fetch(apiUrl, { // Use the absolute URL
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ videoId }),
        });
        const fetchDuration = Date.now() - fetchStart;
        console.log(`[parseYouTubeCommentFlow] Fetch duration: ${fetchDuration} ms`);
        console.log(`[parseYouTubeCommentFlow] Fetch response status: ${response.status}`);
        const responseBody = await response.text(); // Read body as text first for better debugging

        if (!response.ok) {
          console.error('[parseYouTubeCommentFlow] Backend API Error fetching comments:', response.status, response.statusText, responseBody);
          // Try to parse error data if possible
          let errorDetails = responseBody;
          try {
              errorDetails = JSON.parse(responseBody);
          } catch { /* Ignore if body is not JSON */ }
          throw new Error(`Failed to fetch comments via backend: ${response.statusText} - ${typeof errorDetails === 'string' ? errorDetails : JSON.stringify(errorDetails)}`);
        }

        let data;
        try {
            data = JSON.parse(responseBody);
        } catch (parseError) {
            console.error('[parseYouTubeCommentFlow] Failed to parse JSON response:', responseBody);
            throw new Error('Failed to parse response from backend API.');
        }

        console.log(`[parseYouTubeCommentFlow] Received ${data?.comments?.length || 0} comment items from API.`);
        commentsData = data.comments || []; // Extract comment items
        if (commentsData.length > 0) {
          console.log('[parseYouTubeCommentFlow] Sample comments (first 5):');
          commentsData.slice(0, 5).forEach((comment, index) => {
            console.log(`Comment ${index + 1}:`, comment.text || 'No text available');
          });
        }

      } catch (error) {
        console.error('[parseYouTubeCommentFlow] Error calling backend API route or processing response:', error);
        throw new Error(`Error fetching comments: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Fetch description if requested
      if (input.scanDescription) {
        // Use the same internal API to fetch video details (assuming /api/youtube supports it)
        const descApiUrl = `${internalApiBaseUrl}/api/youtube/description`;
        try {
          const descResponse = await fetch(descApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId }),
          });
          const descData = await descResponse.json();
          if (descResponse.ok && descData.description) {
            descriptionText = descData.description;
          }
        } catch (descErr) {
          console.warn('[parseYouTubeCommentFlow] Could not fetch video description:', descErr);
        }
      }
    } else {
        console.warn('[parseYouTubeCommentFlow] Input URL is not a standard video URL. Skipping comment fetch.', input.youtubeUrl);
        throw new Error('Invalid input: Please provide a YouTube video URL (e.g., https://www.youtube.com/watch?v=...).');
    }

    console.log(`[parseYouTubeCommentFlow] Processing ${commentsData.length} comment items with AI prompt...`);
    const aiStart = Date.now();
    let aiPromptCount = 0;
    let aiPromptTotalTime = 0;

    // Process comments with AI prompt
    let allSongs: { title: string; artist: string }[] = [];
    // Only process comments if prioritizePinnedComments is true
    if (input.prioritizePinnedComments) {
      for (const item of commentsData) {
        const commentText = item.text;
        if (commentText) {
          try {
            const promptStart = Date.now();
            const result = await parseCommentPrompt({ commentText });
            const promptDuration = Date.now() - promptStart;
            aiPromptCount++;
            aiPromptTotalTime += promptDuration;
            console.log(`[parseYouTubeCommentFlow] AI prompt duration for comment: ${promptDuration} ms`);
            if (result.output?.songs && result.output.songs.length > 0) {
              allSongs = allSongs.concat(result.output.songs);
              // Stop processing further comments if we have a significant tracklist (5 or more songs)
              if (result.output.songs.length >= 5) {
                console.log(`[parseYouTubeCommentFlow] Detected a tracklist with ${result.output.songs.length} songs. Stopping further comment processing.`);
                break;
              }
            }
          } catch (error) {
            console.error(`[parseYouTubeCommentFlow] Error processing comment:`, error);
          }
        }
      }
    }

    // If description scanning is enabled, process it as well
    if (input.scanDescription && descriptionText) {
      try {
        const promptStart = Date.now();
        const result = await parseCommentPrompt({ commentText: descriptionText });
        const promptDuration = Date.now() - promptStart;
        aiPromptCount++;
        aiPromptTotalTime += promptDuration;
        console.log(`[parseYouTubeCommentFlow] AI prompt duration for description: ${promptDuration} ms`);
        if (result.output?.songs && result.output.songs.length > 0) {
          allSongs = allSongs.concat(result.output.songs);
        }
      } catch (error) {
        console.error(`[parseYouTubeCommentFlow] Error processing description:`, error);
      }
    }

    const aiTotalDuration = Date.now() - aiStart;
    console.log(`[parseYouTubeCommentFlow] AI summary: ${aiPromptCount} prompt calls, total AI time: ${aiPromptTotalTime} ms, avg: ${aiPromptCount ? (aiPromptTotalTime / aiPromptCount).toFixed(2) : 0} ms/call, total elapsed: ${aiTotalDuration} ms`);

    // Deduplicate songs based on title and artist
    const uniqueSongs = Array.from(new Map(
      allSongs.map(song => [`${song.title}-${song.artist}`, song])
    ).values());
    console.log(`[parseYouTubeCommentFlow] Unique songs found: ${uniqueSongs.length}`);

    // Fetch album images for each song (if available)
    const songsWithImages = await Promise.all(uniqueSongs.map(async (song) => {
      try {
        const imageUrl = await getTrackAlbumArt(song.title, song.artist);
        return { ...song, imageUrl: imageUrl || undefined };
      } catch (error) {
        console.error(`[parseYouTubeCommentFlow] Error fetching album art for ${song.title} by ${song.artist}:`, error);
        return song;
      }
    }));

    console.log(`[parseYouTubeCommentFlow] Returning ${songsWithImages.length} unique songs.`);
    if (songsWithImages.length === 0) {
      console.log('[parseYouTubeCommentFlow] No songs identified in the comments or description.');
    }

    return { songs: songsWithImages };
  }
);
