// --- SoundCloud OAuth Authorization API Route ---
/**
 * Initiates the SoundCloud OAuth 2.0 flow by redirecting the user to SoundCloud's authorization page.
 *
 * - Uses environment variables: SOUNDCLOUD_CLIENT_ID, SOUNDCLOUD_REDIRECT_URI
 * - Scopes: non-expiring (for offline access)
 *
 * Returns a redirect to SoundCloud's OAuth page.
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const clientId = process.env.SOUNDCLOUD_CLIENT_ID!;
  const redirectUri = process.env.SOUNDCLOUD_REDIRECT_URI!;
  const scope = 'non-expiring';
  const url = `https://soundcloud.com/connect?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`;
  return NextResponse.redirect(url);
}
