// --- Spotify Callback API Route ---
/**
 * Handles the Spotify OAuth callback, exchanges authorization code for tokens, and sets cookies.
 *
 * - Uses forwarded headers for correct origin in tunnel environments.
 * - Exchanges authorization code for access and refresh tokens.
 * - Sets HTTP-only cookies for tokens and redirects to home.
 *
 * Query Parameters:
 *   - code: The Spotify authorization code (required)
 *
 * Returns a redirect response to the home page with tokens set in cookies.
 */
import { NextRequest, NextResponse } from 'next/server';

// DEPRECATED: This endpoint is no longer needed. Spotify PKCE flow is now handled entirely in the frontend via the SDK.
export async function GET() {
  return new Response(JSON.stringify({ error: 'DEPRECATED: Use frontend PKCE flow.' }), { status: 410, headers: { 'Content-Type': 'application/json' } });
}
