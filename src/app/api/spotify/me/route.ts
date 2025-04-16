import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('spotify_access_token')?.value;
  if (!accessToken) {
    return NextResponse.json({ connected: false });
  }

  // Optionally: Validate token with Spotify
  const resp = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (resp.ok) {
    return NextResponse.json({ connected: true });
  } else {
    return NextResponse.json({ connected: false });
  }
}
