// --- Spotify Search API Route ---

/**
 * API route to search for a track on Spotify using a user access token.
 *
 * - Expects a query string (q) in the request body.
 * - Attempts to parse track and artist for more accurate search.
 * - Requires a valid Spotify access token in cookies.
 *
 * Request JSON:
 *   - q: string (required)
 *
 * Returns JSON with:
 *   - track: The first matching track object or null
 *   - error: Error information if the request fails
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles POST requests to the Spotify Search API route.
 *
 * @param req - NextRequest object
 * @returns NextResponse object
 */
export async function POST(req: NextRequest) {
  // --- Parse Request Body ---

  let q: string | undefined;
  try {
    const body = await req.json();
    q = body.q;
  } catch (e) {
    return NextResponse.json({ error: 'Invalid or empty JSON body' }, { status: 400 });
  }

  // --- Validate Query Parameter ---

  if (!q || typeof q !== 'string' || !q.trim()) {
    return NextResponse.json({ error: 'Missing or invalid query parameter "q".' }, { status: 400 });
  }

  // --- Get Spotify Access Token ---

  // req.cookies.get returns a RequestCookie | undefined, so extract the value
  const cookie = req.cookies.get('spotify_access_token');
  const accessToken: string | undefined = cookie ? cookie.value : undefined;
  console.log('Spotify access token:', accessToken);

  // --- Validate Access Token ---

  if (!accessToken) {
    return NextResponse.json({ error: 'No Spotify user access token found. Please connect your Spotify account.' }, { status: 401 });
  }

  if (typeof accessToken !== 'string' || !accessToken.startsWith('BQ')) { // Spotify user tokens typically start with 'BQ'
    return NextResponse.json({ error: 'Invalid Spotify user access token. Please reconnect your Spotify account.' }, { status: 401 });
  }

  // --- Prepare Search Query ---

  // Use field filters for better accuracy
  let query = q;

  // Try to parse for track and artist if not already formatted
  const match = q.match(/^(.*)\s+-\s+(.*)$/); // e.g. 'Shape of You - Ed Sheeran'
  if (match) {
    query = `track:${match[1].trim()} artist:${match[2].trim()}`;
  } else {
    const parts = q.trim().split(' ');
    if (parts.length > 2) {
      const artist = parts.slice(-2).join(' ');
      const title = parts.slice(0, -2).join(' ');
      query = `track:${title} artist:${artist}`;
    } else if (parts.length === 2) {
      const [title, artist] = parts;
      query = `track:${title} artist:${artist}`;
    } else {
      query = `track:${q}`;
    }
  }

  // --- Make API Request ---

  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // --- Handle API Response ---

  if (!res.ok) {
    let errorMsg = 'Spotify search failed.';
    try {
      const errData = await res.json();
      errorMsg = errData.error?.message || errorMsg;
    } catch {}
    return NextResponse.json({ error: errorMsg }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json({ track: data.tracks?.items?.[0] || null });
}
