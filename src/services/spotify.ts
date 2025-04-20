import { SpotifyApi, AccessToken } from '@spotify/web-api-ts-sdk';

export type Song = {
  title: string;
  artist: string;
  imageUrl?: string;
  videoId?: string;
};

/**
 * Helper to get a Spotify SDK instance using a NextAuth-managed access token, refresh token, and expiry
 */
export function getSpotifySdk(
  accessToken: string | undefined,
  refreshToken?: string,
  expiresAt?: number
): SpotifyApi {
  if (!accessToken) {
    throw new Error('No Spotify access token provided');
  }
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  if (!clientId) {
    throw new Error('No Spotify client ID provided');
  }
  // Calculate expires_in (seconds from now)
  const expires_in = expiresAt ? Math.floor((expiresAt * 1000 - Date.now()) / 1000) : 3600;
  const token: AccessToken = {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in,
    refresh_token: refreshToken || '',
  };
  return SpotifyApi.withAccessToken(clientId, token);
}

/**
 * Robust Spotify Track Search using NextAuth-managed access token
 */
export async function robustSpotifyTrackSearch(song: Song, accessToken: string, refreshToken?: string, expiresAt?: number): Promise<string | null> {
  const sdk = getSpotifySdk(accessToken, refreshToken, expiresAt);
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
      const items = await sdk.search(q, ['track']);
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

/**
 * Create Spotify Playlist using NextAuth-managed access token
 */
export async function createSpotifyPlaylist(
  songs: Song[],
  playlistName: string,
  accessToken: string,
  refreshToken?: string,
  expiresAt?: number,
  isPublic: boolean = true
): Promise<string> {
  const sdk = getSpotifySdk(accessToken, refreshToken, expiresAt);
  try {
    const user = await sdk.currentUser.profile();
    const trackUris = await Promise.all(songs.map((song) => robustSpotifyTrackSearch(song, accessToken, refreshToken, expiresAt)));
    const validTrackUris = trackUris.filter(Boolean) as string[];
    if (validTrackUris.length === 0) {
      throw new Error('No valid Spotify tracks found for the selected songs');
    }
    const playlist = await sdk.playlists.createPlaylist(user.id, {
      name: playlistName,
      public: isPublic,
      description: 'Created by TuneFlow. With <3 from Jon. https://tuneflow.chron0.tech',
    });
    await sdk.playlists.addItemsToPlaylist(playlist.id, validTrackUris);
    return playlist.external_urls?.spotify || '';
  } catch (err: any) {
    console.error('[Spotify SDK Playlist Error]', err);
    return Promise.reject(err);
  }
}
