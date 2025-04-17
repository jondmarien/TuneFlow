// --- SoundCloud OAuth Callback API Route ---
/**
 * Handles the OAuth callback from SoundCloud, exchanges the authorization code for an access token.
 *
 * - Uses environment variables: SOUNDCLOUD_CLIENT_ID, SOUNDCLOUD_CLIENT_SECRET, SOUNDCLOUD_REDIRECT_URI
 * - Stores access token in a secure, HTTP-only cookie.
 *
 * Returns a redirect or JSON response with the access token.
 */
import { NextRequest, NextResponse } from 'next/server';
import { withRequestContext } from '../../_logcontext';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown-ip';
  return withRequestContext(ip, async () => {
    console.log('GET /api/soundcloud/callback');
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    if (!code) {
      return NextResponse.json({ error: 'Missing code in callback.' }, { status: 400 });
    }
    const clientId = process.env.SOUNDCLOUD_CLIENT_ID!;
    const clientSecret = process.env.SOUNDCLOUD_CLIENT_SECRET!;
    const redirectUri = process.env.SOUNDCLOUD_REDIRECT_URI!;

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code,
    });

    const response = await fetch('https://api.soundcloud.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.error_description || 'Failed to obtain access token.' }, { status: 500 });
    }

    // Store access token in a secure, HTTP-only cookie
    const res = NextResponse.redirect('/');
    res.headers.append('Set-Cookie', `soundcloud_access_token=${data.access_token}; HttpOnly; Path=/; Max-Age=${data.expires_in || 86400}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
    return res;
  });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown-ip';
  return withRequestContext(ip, async () => {
    console.log('POST /api/soundcloud/callback');
    // No POST logic implemented
    return NextResponse.json({ error: 'POST requests are not supported.' }, { status: 405 });
  });
}
