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

import { NextRequest, NextResponse } from 'next/server';

// DEPRECATED: This endpoint is no longer needed. Spotify PKCE flow and user profile fetching are now handled entirely in the frontend via the SDK.
export async function GET() {
  return new Response(JSON.stringify({ error: 'DEPRECATED: Use frontend PKCE flow.' }), { status: 410, headers: { 'Content-Type': 'application/json' } });
}
