import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { q } = await req.json();
  const accessToken = req.cookies.get('spotify_access_token');
  if (!accessToken) {
    return NextResponse.json({ error: 'No Spotify access token found.' }, { status: 401 });
  }
  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=1`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    return NextResponse.json({ error: 'Spotify search failed.' }, { status: res.status });
  }
  const data = await res.json();
  const track = data.tracks?.items?.[0];
  return NextResponse.json({ track });
}
