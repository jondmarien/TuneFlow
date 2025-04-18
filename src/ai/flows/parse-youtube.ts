'use server';
/**
 * @fileOverview Parses YouTube comments fetched via a backend API route to identify song titles and artists.
 *
 * - parseYouTubeComment - A function that handles the comment parsing process.
 * - ParseYouTubeCommentInput - The input type for the parseYouTubeComment function.
 * - ParseYouTubeCommentOutput - The return type for the parseYouTubeComment function.
 */

// --- Batching and Prompt Length Constants ---
const MAX_PROMPT_LENGTH = 2048; // Truncate input text above this length
const BATCH_SIZE = 5; // How many comments to batch per AI call

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import { getTrackAlbumArt } from '@/services/spotify-service';
import { redis } from '@/utils/redis';

// --- Input and Output Schemas ---
const ParseYouTubeCommentInputSchema = z.object({
  youtubeUrl: z.string().describe('The YouTube video URL.'), // Only video URL is supported now
  prioritizePinnedComments: z
    .boolean()
    .default(false)
    .describe('Whether to prioritize pinned comments (Note: Pinned status might not be available via basic commentThreads endpoint).'),
  scanDescription: z
    .boolean()
    .default(false)
    .describe('Whether to scan the video description for song and artist info.'),
  chapters: z.string().optional().describe('Chapters text extracted from YouTube video, if available.'),
  comments: z.array(z.object({
    id: z.string().nullable().optional(),
    author: z.string().nullable().optional(),
    text: z.string().nullable().optional(),
    publishedAt: z.string().nullable().optional(),
  })).optional().describe('Array of YouTube comment objects to process.'),
  description: z.string().optional().describe('Video description text to process.'),
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

// --- Public Function ---
export async function parseYouTubeComment(input: ParseYouTubeCommentInput): Promise<ParseYouTubeCommentOutput> {
  return parseYouTubeCommentFlow(input);
}

// --- AI Tool Definition ---
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

// --- AI Prompt Definition ---
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

// --- AI Flow Definition ---
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

    // If chapters are provided, process those directly
    if (input.chapters) {
      // Treat chapters as a single batch for AI
      const cleanedChapters = cleanComment(input.chapters);
      const truncatedChapters = logAndTruncate(cleanedChapters, 'Chapters');
      const hash = 'chapters:' + truncatedChapters;
      let chapterSongs: { title: string; artist: string }[] = [];
      const cached = await redis.get(hash);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.songs)) {
            console.log(`[parseYouTubeCommentFlow] AI cache hit for chapters.`);
            chapterSongs = parsed.songs;
          }
        } catch {}
      }
      if (!chapterSongs.length) {
        try {
          const result = await parseCommentPrompt({ commentText: truncatedChapters });
          if (result.output?.songs && result.output.songs.length > 0) {
            chapterSongs = result.output.songs;
            await redis.set(hash, JSON.stringify({ songs: chapterSongs }), 'EX', 60 * 60 * 24);
          }
        } catch (error) {
          console.error(`[parseYouTubeCommentFlow] Error processing chapters:`, error);
        }
      }
      // Return early if chapters were processed
      const songsWithImages = await Promise.all(chapterSongs.map(async (song: { title: string; artist: string }) => {
        const key = `albumArt:${song.title}|||${song.artist}`;
        let imageUrl: string | null = await redis.get(key);
        if (!imageUrl) {
          getTrackAlbumArt(song.title, song.artist).then(url => {
            if (url) redis.set(key, url, 'EX', 60 * 60 * 24);
          });
        }
        return { ...song, imageUrl: imageUrl ?? undefined };
      }));
      return { songs: songsWithImages };
    }

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

    // --- Utility: Clean comment (strip whitespace, emojis, metadata) ---
    function cleanComment(text: string): string {
      if (!text) return '';
      // Remove emojis
      const emojiRegex = /[\p{Emoji_Presentation}\p{Emoji}\u200d]+/gu;
      let cleaned = text.replace(emojiRegex, '');
      // Remove YouTube metadata (timestamps, "Edited", etc)
      cleaned = cleaned.replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, ''); // timestamps
      cleaned = cleaned.replace(/\bEdited\b/gi, '');
      // Remove excessive whitespace
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
      return cleaned;
    }

    // --- Step 1 & 2: Batching and Prompt Length Logging ---
    function logAndTruncate(text: string, label: string): string {
      const length = text.length;
      console.log(`[parseYouTubeCommentFlow] ${label} length: ${length} chars`);
      if (length > MAX_PROMPT_LENGTH) {
        console.warn(`[parseYouTubeCommentFlow] ${label} exceeds ${MAX_PROMPT_LENGTH} chars. Truncating.`);
        return text.slice(0, MAX_PROMPT_LENGTH);
      }
      return text;
    }

    // --- Full-prompt batching: try to fit as many cleaned comments as possible in one prompt ---
    const commentTexts = commentsData.map(item => cleanComment(item.text)).filter(Boolean);
    let batches: string[][] = [];
    let currentBatch: string[] = [];
    let currentLength = 0;
    for (const comment of commentTexts) {
      const toAdd = `Comment ${currentBatch.length + 1}:\n${comment}\n---\n`;
      if (currentLength + toAdd.length > MAX_PROMPT_LENGTH && currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        currentLength = 0;
      }
      currentBatch.push(comment);
      currentLength += toAdd.length;
    }
    if (currentBatch.length > 0) batches.push(currentBatch);

    // --- Helper to batch process comments with AI caching ---
    async function processCommentBatch(comments: string[]): Promise<{ title: string; artist: string }[]> {
      const joined = comments.map((c, i) => `Comment ${i + 1}:\n${c}`).join('\n---\n');
      const truncated = logAndTruncate(joined, `Batch of ${comments.length} comments`);
      const hash = truncated; // Simple cache key (could hash for more robustness)
      const cached = await redis.get(hash);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.songs)) {
            console.log(`[parseYouTubeCommentFlow] AI cache hit for batch.`);
            return parsed.songs;
          }
        } catch {}
      }
      const promptStart = Date.now();
      let result;
      try {
        result = await parseCommentPrompt({ commentText: truncated });
      } catch (error) {
        console.error(`[parseYouTubeCommentFlow] Error in batch AI prompt:`, error);
        return [];
      }
      const promptDuration = Date.now() - promptStart;
      aiPromptCount++;
      aiPromptTotalTime += promptDuration;
      console.log(`[parseYouTubeCommentFlow] AI prompt duration for batch: ${promptDuration} ms`);
      if (result.output?.songs && result.output.songs.length > 0) {
        await redis.set(hash, JSON.stringify({ songs: result.output.songs }), 'EX', 60 * 60 * 24);
        return result.output.songs;
      }
      await redis.set(hash, JSON.stringify({ songs: [] }), 'EX', 60 * 60 * 24);
      return [];
    }

    let allSongs: { title: string; artist: string }[] = [];

    // --- Step 2: Full-prompt batching logic ---
    if (input.prioritizePinnedComments) {
      for (const batch of batches) {
        if (batch.length === 0) continue;
        try {
          const songs = await processCommentBatch(batch);
          allSongs = allSongs.concat(songs);
          if (songs.length >= 5) {
            console.log(`[parseYouTubeCommentFlow] Detected a tracklist with ${songs.length} songs in batch. Stopping further comment processing.`);
            break;
          }
        } catch (error) {
          console.error(`[parseYouTubeCommentFlow] Error processing comment batch:`, error);
        }
      }
    }

    // If description scanning is enabled, process it as well
    if (input.scanDescription && descriptionText) {
      try {
        const cleanedDesc = cleanComment(descriptionText);
        const truncatedDesc = logAndTruncate(cleanedDesc, 'Description');
        const hash = truncatedDesc;
        let descSongs: { title: string; artist: string }[] = [];
        const cached = await redis.get(hash);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed.songs)) {
              console.log(`[parseYouTubeCommentFlow] AI cache hit for description.`);
              descSongs = parsed.songs;
            }
          } catch {}
        } else {
          const promptStart = Date.now();
          const result = await parseCommentPrompt({ commentText: truncatedDesc });
          const promptDuration = Date.now() - promptStart;
          aiPromptCount++;
          aiPromptTotalTime += promptDuration;
          console.log(`[parseYouTubeCommentFlow] AI prompt duration for description: ${promptDuration} ms`);
          descSongs = result.output?.songs || [];
          await redis.set(hash, JSON.stringify({ songs: descSongs }), 'EX', 60 * 60 * 24);
        }
        if (descSongs.length > 0) {
          allSongs = allSongs.concat(descSongs);
        }
      } catch (error) {
        console.error(`[parseYouTubeCommentFlow] Error processing description:`, error);
      }
    }

    const aiTotalDuration = Date.now() - aiStart;
    console.log(`[parseYouTubeCommentFlow] AI summary: ${aiPromptCount} prompt calls, total AI time: ${aiPromptTotalTime} ms, avg: ${aiPromptCount ? (aiPromptTotalTime / aiPromptCount).toFixed(2) : 0} ms/call, total elapsed: ${aiTotalDuration} ms`);

    // Deduplicate songs based on title and artist
    const uniqueSongs = Array.from(new Map(
      allSongs.map((song: { title: string; artist: string }) => [`${song.title}-${song.artist}`, song])
    ).values()) as { title: string; artist: string }[];
    console.log(`[parseYouTubeCommentFlow] Unique songs found: ${uniqueSongs.length}`);

    // --- Async album art fetching: return results immediately, fetch album art in background ---
    // Instead of waiting for album art, return songs with imageUrl: null, and trigger background fetch (pseudo, see below)
    const songsWithImages = await Promise.all(uniqueSongs.map(async (song: { title: string; artist: string }) => {
      const key = `albumArt:${song.title}|||${song.artist}`;
      let imageUrl: string | null = await redis.get(key);
      if (!imageUrl) {
        // Fire and forget async fetch
        getTrackAlbumArt(song.title, song.artist).then(url => {
          if (url) {
            redis.set(key, url, 'EX', 60 * 60 * 24); // Cache for 24 hours
          }
        });
      }
      return { ...song, imageUrl: imageUrl ?? undefined };
    }));

    console.log(`[parseYouTubeCommentFlow] Returning ${songsWithImages.length} unique songs (album art may load async).`);
    if (songsWithImages.length === 0) {
      console.log('[parseYouTubeCommentFlow] No songs identified in the comments or description.');
    }

    return { songs: songsWithImages };
  }
);
