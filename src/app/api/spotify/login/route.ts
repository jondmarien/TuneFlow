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

// DEPRECATED: This endpoint is no longer needed. Spotify PKCE flow is now handled entirely in the frontend via the SDK.
export async function GET() {
  return new Response(JSON.stringify({ error: 'DEPRECATED: Use frontend PKCE flow.' }), { status: 410, headers: { 'Content-Type': 'application/json' } });
}
