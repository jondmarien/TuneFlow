'use server';
/**
 * @fileOverview Parses YouTube comments to identify song titles and artists.
 *
 * - parseYouTubeComment - A function that handles the comment parsing process.
 * - ParseYouTubeCommentInput - The input type for the parseYouTubeComment function.
 * - ParseYouTubeCommentOutput - The return type for the parseYouTubeComment function.
 */

import {ai} from '@/ai/ai-instance';
import {YouTubeComment, getComment, getVideoComments} from '@/services/youtube';
import {z} from 'genkit';

const ParseYouTubeCommentInputSchema = z.object({
  youtubeUrl: z.string().describe('The YouTube video or comment URL.'),
  prioritizePinnedComments: z
    .boolean()
    .default(false)
    .describe('Whether to prioritize pinned comments when parsing video links.'),
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

export async function parseYouTubeComment(input: ParseYouTubeCommentInput): Promise<ParseYouTubeCommentOutput> {
  return parseYouTubeCommentFlow(input);
}

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
  // TODO: Implement more robust extraction logic here, possibly using a dedicated music metadata service.
  const parts = input.text.split('-');
  if (parts.length >= 2) {
    return {
      artist: parts[0].trim(),
      title: parts[1].trim(),
    };
  } else {
    return {
      artist: 'Unknown',
      title: input.text.trim(),
    };
  }
});

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

  Use the extractSongInfo tool to extract the song title and artist from the comment text. Be as accurate as possible.

  Comment: {{{commentText}}}
  `, // Ensure Handlebars syntax is used
});

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
    let comments: YouTubeComment[] = [];

    if (input.youtubeUrl.includes('watch')) {
      // It's a video URL
      const videoId = new URL(input.youtubeUrl).searchParams.get('v')!;
      comments = await getVideoComments(videoId);

      if (input.prioritizePinnedComments) {
        // Prioritize pinned comments (move to the front)
        const pinnedComments = comments.filter(comment => comment.pinned);
        const unpinnedComments = comments.filter(comment => !comment.pinned);
        comments = [...pinnedComments, ...unpinnedComments];
      }
    } else {
      // It's a comment URL
      const comment = await getComment(input.youtubeUrl);
      comments = [comment];
    }

    const songs: { title: string; artist: string; }[] = [];

    for (const comment of comments) {
      const {output} = await parseCommentPrompt({commentText: comment.text});
      if (output?.songs) {
        songs.push(...output.songs);
      }
    }

    return {songs};
  }
);
