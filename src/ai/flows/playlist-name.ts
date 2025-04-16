import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const PlaylistNameInputSchema = z.object({
  genres: z.array(z.string()).describe('A list of genres or categories for the playlist.'),
  songs: z.array(z.object({
    title: z.string(),
    artist: z.string()
  })).describe('A list of songs with title and artist.'),
});

export type PlaylistNameInput = z.infer<typeof PlaylistNameInputSchema>;

const PlaylistNameOutputSchema = z.object({
  name: z.string().describe('A creative playlist name based on the genres and songs.'),
});

export type PlaylistNameOutput = z.infer<typeof PlaylistNameOutputSchema>;

export const generatePlaylistName = ai.definePrompt({
  name: 'generatePlaylistName',
  description: 'Creates a creative playlist name based on genres and song list.',
  input: PlaylistNameInputSchema,
  output: PlaylistNameOutputSchema,
  prompt: ({ genres, songs }: { genres: string[]; songs: { title: string; artist: string }[] }) => [{
    text: [
      'Create a short, catchy playlist name for a Spotify playlist.',
      `The playlist contains songs from these genres/categories: ${genres.length > 0 ? genres.join(', ') : 'various genres'}.`,
      songs && songs.length > 0 ? `Here are some of the songs: ${songs.slice(0, 5).map((s) => `${s.title} by ${s.artist}`).join('; ')}.` : '',
      'The name should be fun, engaging, and reflect the genres. Only return the name, no extra text.'
    ].filter(Boolean).join(' ')
  }]
});
