import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('spotify_refresh_token')?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: 'No Spotify refresh token found.' }, { status: 401 });
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
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
    return NextResponse.json({ error: data.error_description || 'Failed to refresh token' }, { status: 500 });
  }

  // Update the access token cookie
  const res = NextResponse.json({ access_token: data.access_token, expires_in: data.expires_in });
  res.headers.append('Set-Cookie', `spotify_access_token=${data.access_token}; HttpOnly; Path=/; Max-Age=${data.expires_in}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  return res;
}
