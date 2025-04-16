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

/**
 * Handles GET requests to the Spotify callback API route.
 *
 * @param req - NextRequest object
 * @returns NextResponse object (redirect)
 */
export async function GET(req: NextRequest) {
  // --- Determine True Origin ---
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const forwardedHost = req.headers.get('x-forwarded-host');
  let trueOrigin = req.nextUrl.origin;
  if (forwardedProto && forwardedHost) {
    trueOrigin = `${forwardedProto}://${forwardedHost}`;
  }
  console.log('Callback origin:', trueOrigin);

  // --- Parse Authorization Code ---
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  // --- Prepare Token Request ---
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
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
    return NextResponse.json({ error: data.error_description || 'Failed to fetch tokens' }, { status: 500 });
  }

  // --- Set Cookies and Redirect ---
  const homeUrl = trueOrigin + '/';
  const res = NextResponse.redirect(homeUrl);
  res.headers.append('Set-Cookie', `spotify_access_token=${data.access_token}; HttpOnly; Path=/; Max-Age=${data.expires_in}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  res.headers.append('Set-Cookie', `spotify_refresh_token=${data.refresh_token}; HttpOnly; Path=/; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);

  return res;
}
