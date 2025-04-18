// --- Spotify Login API Route ---

/**
 * API route to initiate the Spotify OAuth login flow.
 *
 * - Constructs the Spotify authorization URL with required scopes and redirect URI.
 * - Redirects the user to the Spotify authorization page.
 *
 * Returns a redirect response to the Spotify authorization endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles GET requests to the Spotify login API route.
 *
 * @param req - NextRequest object
 * @returns NextResponse object (redirect)
 */
export async function GET(req: NextRequest) {
  // --- ENV CHECK ---
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_REDIRECT_URI) {
    console.error('[Spotify Login] Missing SPOTIFY_CLIENT_ID or SPOTIFY_REDIRECT_URI in environment variables.');
    return NextResponse.json({ error: 'Spotify login misconfigured: missing environment variables.' }, { status: 500 });
  }
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    scope: 'playlist-modify-private playlist-modify-public',
    show_dialog: 'true',
  });
  return NextResponse.redirect('https://accounts.spotify.com/authorize?' + params.toString());
}
