'use server';
/**
 * @fileOverview Parses YouTube comments fetched via a backend API route to identify song titles and artists.
 *
 * - parseYouTubeComment - A function that handles the comment parsing process.
 * - ParseYouTubeCommentInput - The input type for the parseYouTubeComment function.
 * - ParseYouTubeCommentOutput - The return type for the parseYouTubeComment function.
 */

import {ai} from '@/ai/ai-instance';
// Removed: import {YouTubeComment, getVideoComments} from '@/services/youtube';
import {z} from 'genkit';

// --- Input and Output Schemas (Unchanged) ---
const ParseYouTubeCommentInputSchema = z.object({
  youtubeUrl: z.string().describe('The YouTube video URL.'), // Updated description: Only video URL is supported now
  prioritizePinnedComments: z
    .boolean()
    .default(false)
    .describe('Whether to prioritize pinned comments (Note: Pinned status might not be available via basic commentThreads endpoint).'),
});
export type ParseYouTubeCommentInput = z.infer<typeof ParseYouTubeCommentInputSchema>;

const ParseYouTubeCommentOutputSchema = z.object({
  songs: z.array(
    z.object({
      title: z.string().describe('The title of the song.'),
      artist: z.string().describe('The artist of the song.'),
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

    // Only handle video URLs as per the current API route
    if (input.youtubeUrl.includes('watch?v=')) {
      const videoId = new URL(input.youtubeUrl).searchParams.get('v');
      if (!videoId) {
        throw new Error('Invalid YouTube video URL: Missing video ID.');
      }

      try {
        // Call the backend API route
        const response = await fetch('/api/youtube', { // Assuming relative path works from server-side flow
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ videoId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Backend API Error fetching comments:', errorData);
          throw new Error(`Failed to fetch comments via backend: ${response.statusText}`);
        }

        const data = await response.json();
        commentsData = data.items || []; // Extract comment items

        // Note: Prioritizing pinned comments might require changes.
        // The commentThreads endpoint might not return pinned status directly in the default `part=snippet`.
        // You might need to adjust the API route or the parsing here if pinned status is crucial.

      } catch (error) {
        console.error('Error calling backend API route:', error);
        throw new Error(`Error fetching comments: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
        // Removed direct comment URL handling - API route needs videoId
        console.warn('Input URL is not a standard video URL. Skipping comment fetch.', input.youtubeUrl);
        // Alternatively, attempt to extract videoId if possible, or throw error:
        throw new Error('Invalid input: Please provide a YouTube video URL (e.g., https://www.youtube.com/watch?v=...).');
    }

    const songs: { title: string; artist: string; }[] = [];

    // Process comments fetched from the API route
    for (const item of commentsData) {
        // Extract the actual comment text
        // Structure is item -> snippet -> topLevelComment -> snippet -> textDisplay
        const commentText = item?.snippet?.topLevelComment?.snippet?.textDisplay;
        if (commentText) {
            try {
                 const {output} = await parseCommentPrompt({ commentText });
                 if (output?.songs) {
                    songs.push(...output.songs);
                 }
            } catch (promptError) {
                console.error('Error processing comment with AI prompt:', promptError, 'Comment text:', commentText);
                // Decide if you want to skip the comment or handle the error differently
            }
        }
    }

    // Deduplicate songs (simple deduplication based on title and artist)
    const uniqueSongs = songs.filter((song, index, self) =>
        index === self.findIndex((s) => (
            s.title.toLowerCase() === song.title.toLowerCase() &&
            s.artist.toLowerCase() === song.artist.toLowerCase()
        ))
    );

    return { songs: uniqueSongs };
  }
);
