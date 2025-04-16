// --- SoundCloud Track Search API Route ---
/**
 * API route to search for tracks on SoundCloud by query string.
 *
 * - Requires SOUNDCLOUD_CLIENT_ID in environment variables.
 * - Optionally uses access token from cookies for user-specific results.
 *
 * Request query:
 *   - q: string (required)
 *
 * Returns JSON with:
 *   - tracks: Array of SoundCloud track objects
 *   - error: Error information if the request fails
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  if (!q) return NextResponse.json({ error: 'Missing query' }, { status: 400 });

  const clientId = process.env.SOUNDCLOUD_CLIENT_ID!;
  // Optionally, could use access token for authenticated user
  // const accessToken = req.cookies.get('soundcloud_access_token')?.value;
  const url = `https://api.soundcloud.com/tracks?q=${encodeURIComponent(q)}&client_id=${clientId}&limit=10`;

  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    return NextResponse.json({ error: data.errors?.[0]?.error_message || 'Failed to fetch tracks' }, { status: response.status });
  }
  return NextResponse.json({ tracks: data });
}
