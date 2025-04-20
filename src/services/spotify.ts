import { SpotifyApi } from '@spotify/web-api-ts-sdk';

// Singleton instance for the Spotify SDK (PKCE flow)
export const spotifySdk = SpotifyApi.withUserAuthorization(
  process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
  process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI!,
  [
    'playlist-modify-public',
    'playlist-modify-private',
    // add any other scopes you need
  ]
);

export type Song = {
  title: string;
  artist: string;
  imageUrl?: string;
  videoId?: string;
};

// Robust Spotify Track Search
export async function robustSpotifyTrackSearch(song: Song): Promise<string | null> {
  const queries = [
    `${song.title} ${song.artist}`,
    song.title,
    `${song.title.replace(/\s*\([^)]*\)/g, '')} ${song.artist}`.trim(),
    `${song.title} (explicit) ${song.artist}`,
    `${song.title} (with ${song.artist})`,
    song.artist,
  ];
  for (const q of queries) {
    try {
      const items = await spotifySdk.search(q, ['track']);
      if (!items || !items.tracks || !Array.isArray(items.tracks.items) || !items.tracks.items.length) continue;
      const track = items.tracks.items[0];
      const cleanTitle = song.title.replace(/\s*\([^)]*\)/g, '').toLowerCase();
      if (track.name.toLowerCase().includes(cleanTitle) || track.name.toLowerCase().includes(song.title.toLowerCase())) {
        return track.uri;
      }
      if (track.artists && track.artists.some((a: any) => a.name.toLowerCase().includes(song.artist.toLowerCase()))) {
        return track.uri;
      }
      return track.uri;
    } catch (err: any) {
      console.error('[Spotify SDK Track Search Error]', err);
      // continue to next query
    }
  }
  return null;
}

// Create Spotify Playlist
export async function createSpotifyPlaylist(songs: Song[], playlistName: string, isPublic: boolean = true): Promise<string> {
  try {
    const user = await spotifySdk.currentUser.profile();
    const trackUris = await Promise.all(songs.map((song) => robustSpotifyTrackSearch(song)));
    const validTrackUris = trackUris.filter(Boolean) as string[];
    if (validTrackUris.length === 0) {
      throw new Error('No valid Spotify tracks found for the selected songs');
    }
    const playlist = await spotifySdk.playlists.createPlaylist(user.id, {
      name: playlistName,
      public: isPublic,
      description: 'Created by TuneFlow. With <3 from Jon. https://tuneflow.chron0.tech',
    });
    await spotifySdk.playlists.addItemsToPlaylist(playlist.id, validTrackUris);
    return playlist.external_urls?.spotify || '';
  } catch (err: any) {
    console.error('[Spotify SDK Playlist Error]', err);
    return Promise.reject(err);
  }
}
