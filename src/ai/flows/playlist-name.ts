import { ai } from '@/ai/ai-instance';
import { z } from 'zod';

// Use z.object for compatibility and Genkit integration
const SongSchema = z.object({
  title: z.string().describe('The title of the song').meta({ example: 'Imagine' }),
  artist: z.string().describe('The artist of the song').meta({ example: 'John Lennon' }),
}).meta({ title: 'Song' });

const PlaylistNameInputSchema = z.object({
  genres: z.array(z.string().describe('A genre or category')).describe('A list of genres or categories for the playlist').meta({ examples: [['rock', 'pop']] }),
  songs: z.array(SongSchema).describe('A list of songs with title and artist').meta({ minItems: 1 }),
}).meta({ title: 'PlaylistNameInput' });

export type PlaylistNameInput = z.infer<typeof PlaylistNameInputSchema>;

const PlaylistNameOutputSchema = z.object({
  name: z.string().describe('A creative playlist name based on the genres and songs').meta({ example: 'Summer Rock Anthems' }),
}).meta({ title: 'PlaylistNameOutput' });

export type PlaylistNameOutput = z.infer<typeof PlaylistNameOutputSchema>;

// Genkit prompt with fallback: try to use .toJSONSchema(), fallback to schema direct
let inputSchema: any = PlaylistNameInputSchema;
let outputSchema: any = PlaylistNameOutputSchema;

export const generatePlaylistName = ai.definePrompt({
  name: 'generatePlaylistName',
  description: 'Creates a creative playlist name based on genres and song list.',
  input: inputSchema,
  output: outputSchema,
  prompt: ({ genres, songs }: { genres: string[]; songs: { title: string; artist: string }[] }) => [{
    text: [
      'Create a short, catchy playlist name for a Spotify playlist.',
      `The playlist contains songs from these genres/categories: ${genres.length > 0 ? genres.join(', ') : 'various genres'}.`,
      songs && songs.length > 0 ? `Here are some of the songs: ${songs.slice(0, 5).map((s) => `${s.title} by ${s.artist}`).join('; ')}.` : '',
      'The name should be fun, engaging, and reflect the genres. Only return the name, no extra text.'
    ].filter(Boolean).join(' ')
  }]
});
