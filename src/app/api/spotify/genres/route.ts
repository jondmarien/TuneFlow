import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Use the Spotify API to fetch available genre seeds
  const res = await fetch('https://api.spotify.com/v1/recommendations/available-genre-seeds', {
    headers: {
      Authorization: `Bearer ${process.env.SPOTIFY_CLIENT_CREDENTIALS_TOKEN}` // Ideally, use a valid access token
    }
  });
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch genres from Spotify' }, { status: res.status });
  }
  const data = await res.json();
  return NextResponse.json({ genres: data.genres });
}
