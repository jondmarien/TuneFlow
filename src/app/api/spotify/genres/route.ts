import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/services/spotify-service';

export async function GET(req: NextRequest) {
  try {
    // This is a CLIENT CREDENTIALS token, not a user token!
    const accessToken = await getAccessToken();
    const res = await fetch('https://api.spotify.com/v1/recommendations/available-genre-seeds', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch genres from Spotify' }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json({ genres: data.genres });
  } catch (error) {
    const errMsg = typeof error === 'object' && error && 'message' in error ? (error as any).message : String(error);
    return NextResponse.json({ error: 'Failed to fetch genres from Spotify', details: errMsg }, { status: 500 });
  }
}
