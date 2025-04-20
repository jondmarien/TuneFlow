import type { Song } from "@/types/tuneflow";

/**
 * Creates a Spotify playlist.
 * @param songs - Array of Song objects
 * @param playlistName - Name for the playlist
 * @param useAiName - Whether to use AI to generate the playlist name
 * @returns playlistUrl (string) if successful
 */
export async function createSpotifyPlaylist(songs: Song[], playlistName: string, useAiName: boolean): Promise<string> {
  // Remove all Spotify SDK logic and utilities from this file. Use src/services/spotify.ts instead.
  throw new Error('Not implemented');
}

/**
 * Searches for a Spotify track URI for a given song.
 * @param song - Song object
 * @returns Spotify track URI string or null
 */
export async function searchSpotifyTrackUri(song: Song): Promise<string | null> {
  // Remove all Spotify SDK logic and utilities from this file. Use src/services/spotify.ts instead.
  throw new Error('Not implemented');
}
