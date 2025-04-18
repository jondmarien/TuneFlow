// --- Spotify Me API Route ---

/**
 * API route to check if the user is connected to Spotify and fetch user profile info.
 *
 * - Checks for a valid Spotify access token in cookies.
 * - Optionally validates the token with Spotify's /me endpoint.
 * - Returns user info if connected, otherwise indicates not connected.
 *
 * Returns JSON with:
 *   - connected: boolean
 *   - id, display_name, ...user: user info if connected
 */

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { withRequestContext } from '../../_logcontext';

/**
 * Handles GET requests to the Spotify Me API route.
 *
 * @param req - NextRequest object
 * @returns NextResponse object
 */
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown-ip';
  return withRequestContext(ip, async () => {
    console.log('GET /api/spotify/me (Spotify login check)');
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('spotify_access_token')?.value;
    if (!accessToken) {
      console.warn('[Spotify Me] No spotify_access_token cookie found. Returning connected: false.');
      return NextResponse.json({ connected: false });
    }

    // Optionally: Validate token with Spotify
    console.log('Checking Spotify /me endpoint');
    try {
      const resp = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (resp.ok) {
        const user = await resp.json();
        return NextResponse.json({ connected: true, id: user.id, display_name: user.display_name, ...user });
      } else {
        const errorData = await resp.json().catch(() => ({}));
        console.error('[Spotify Me] Spotify /me endpoint failed', resp.status, errorData);
        return NextResponse.json({ connected: false });
      }
    } catch (err) {
      console.error('[Spotify Me] Error fetching Spotify /me endpoint:', err);
      return NextResponse.json({ connected: false });
    }
  });
}
