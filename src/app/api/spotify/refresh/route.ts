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

import { NextRequest, NextResponse } from 'next/server';

// DEPRECATED: This endpoint is no longer needed. Spotify PKCE flow is now handled entirely in the frontend via the SDK.
export async function POST() {
  return new Response(JSON.stringify({ error: 'DEPRECATED: Use frontend PKCE flow.' }), { status: 410, headers: { 'Content-Type': 'application/json' } });
}
