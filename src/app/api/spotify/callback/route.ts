import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Use forwarded headers if present (for ngrok/tunnels)
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const forwardedHost = req.headers.get('x-forwarded-host');
  let trueOrigin = req.nextUrl.origin;
  if (forwardedProto && forwardedHost) {
    trueOrigin = `${forwardedProto}://${forwardedHost}`;
  }
  console.log('Callback origin:', trueOrigin);

  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

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

  // Set cookies using response headers
  const homeUrl = trueOrigin + '/';
  const res = NextResponse.redirect(homeUrl);
  res.headers.append('Set-Cookie', `spotify_access_token=${data.access_token}; HttpOnly; Path=/; Max-Age=${data.expires_in}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  res.headers.append('Set-Cookie', `spotify_refresh_token=${data.refresh_token}; HttpOnly; Path=/; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);

  return res;
}
