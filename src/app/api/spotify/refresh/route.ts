// --- Spotify Refresh Token API Route ---

/**
 * API route to refresh the Spotify access token using the refresh token in cookies.
 *
 * - Expects a valid Spotify refresh token in cookies.
 * - Requests a new access token from Spotify and updates the cookie.
 *
 * Returns JSON with:
 *   - access_token: string
 *   - expires_in: number
 *   - error: Error information if the request fails
 */

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles POST requests to the Spotify refresh token API route.
 *
 * @returns NextResponse object
 */
export async function POST() {
  // Get Spotify refresh token from cookies
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('spotify_refresh_token')?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: 'No Spotify refresh token found.' }, { status: 401 });
  }

  // Prepare token refresh request
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
  });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await response.json();
  if (!response.ok) {
    return NextResponse.json({ error: data.error_description || 'Failed to refresh token' }, { status: 500 });
  }

  // Update the access token cookie
  const res = NextResponse.json({ access_token: data.access_token, expires_in: data.expires_in });
  res.headers.append('Set-Cookie', `spotify_access_token=${data.access_token}; HttpOnly; Path=/; Max-Age=${data.expires_in}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  return res;
}
