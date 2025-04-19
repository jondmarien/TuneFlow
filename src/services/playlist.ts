import type { Song } from "@/types/tuneflow";

/**
 * Creates a Spotify playlist via backend API.
 * @param songs - Array of Song objects
 * @param playlistName - Name for the playlist
 * @returns playlistUrl (string) if successful
 */
export async function createSpotifyPlaylist(songs: Song[], playlistName: string): Promise<string> {
  // Fetch Spotify user ID
  const userRes = await fetch("/api/spotify/me");
  const userData = await userRes.json();
  if (!userData.id) {
    throw new Error("Could not fetch Spotify user ID");
  }
  // Find Spotify track URIs for all parsed songs
  const trackUris = await Promise.all(
    songs.map((song) => searchSpotifyTrackUri(song))
  );
  const validTrackUris = trackUris.filter(Boolean);
  if (validTrackUris.length === 0) {
    throw new Error("No valid Spotify tracks found for the selected songs");
  }
  const resp = await fetch('/api/spotify/playlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: userData.id, playlistName, trackUris: validTrackUris }),
  });
  const data = await resp.json();
  if (resp.ok && data.playlistUrl) {
    return data.playlistUrl;
  }
  throw new Error(data.error || 'Failed to create Spotify playlist');
}

/**
 * Searches for a Spotify track URI for a given song via backend API.
 * @param song - Song object
 * @returns Spotify track URI string or null
 */
export async function searchSpotifyTrackUri(song: Song, signal?: AbortSignal): Promise<string | null> {
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
      const res = await fetch('/api/spotify/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q }),
        signal,
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.track && data.track.uri) {
        const cleanTitle = song.title.replace(/\s*\([^)]*\)/g, '').toLowerCase();
        if (data.track.name.toLowerCase().includes(cleanTitle) || data.track.name.toLowerCase().includes(song.title.toLowerCase())) {
          return data.track.uri;
        }
        if (data.track.artists && data.track.artists.some((a: { name: string }) => a.name.toLowerCase().includes(song.artist.toLowerCase()))) {
          return data.track.uri;
        }
        return data.track.uri;
      }
    } catch {
      return null;
    }
  }
  return null;
}
