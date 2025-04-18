import type { Song } from "@/types/tuneflow";

/**
 * Fetches YouTube comments, chapters, or description via backend API.
 * @param endpoint - 'comments' | 'chapters' | 'description'
 * @param payload - Request body
 */
export async function fetchYouTubeData<T>(endpoint: 'comments' | 'chapters' | 'description', payload: any): Promise<T> {
  const resp = await fetch(`/api/youtube/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.error || `Failed to fetch ${endpoint}`);
  }
  return resp.json();
}

/**
 * Fetches Spotify user connection status.
 */
export async function fetchSpotifyConnection(): Promise<{ connected: boolean }> {
  const resp = await fetch('/api/spotify/me');
  return resp.json();
}
