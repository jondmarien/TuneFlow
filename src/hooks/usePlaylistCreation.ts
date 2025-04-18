import { useState, useCallback } from "react";
import type { Song } from "@/types/tuneflow";

/**
 * Custom React Hook: usePlaylistCreation
 *
 * Handles the logic for creating a playlist from a list of songs, including async API calls.
 * Returns status, error, and a createPlaylist function.
 */
export function usePlaylistCreation() {
  const [status, setStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);

  const createPlaylist = useCallback(async (songs: Song[], playlistName: string, useAiName: boolean) => {
    setStatus('creating');
    setError(null);
    setPlaylistUrl(null);
    try {
      // Fetch Spotify user ID
      const userRes = await fetch("/api/spotify/me");
      const userData = await userRes.json();
      if (!userData.id) {
        setError("Could not fetch Spotify user ID");
        setStatus('error');
        return;
      }
      // Find Spotify track URIs for all parsed songs
      const trackUris = await Promise.all(
        songs.map((song) => import("@/services/playlist").then(m => m.searchSpotifyTrackUri(song)))
      );
      const validTrackUris = trackUris.filter(Boolean);
      if (validTrackUris.length === 0) {
        setError("No valid Spotify tracks found for the selected songs");
        setStatus('error');
        return;
      }
      const resp = await fetch('/api/spotify/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userData.id, playlistName, trackUris: validTrackUris }),
      });
      const data = await resp.json();
      if (resp.ok && data.playlistUrl) {
        setPlaylistUrl(data.playlistUrl);
        setStatus('success');
      } else {
        setError(data.error || 'Failed to create playlist');
        setStatus('error');
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      setStatus('error');
    }
  }, []);

  return { status, error, playlistUrl, createPlaylist };
}
