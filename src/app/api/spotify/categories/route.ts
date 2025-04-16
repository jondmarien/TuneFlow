import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/services/spotify-service';

export async function GET(req: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'No Spotify client access token found.' }, { status: 401 });
    }
    // Fetch Spotify categories as genres
    const res = await fetch('https://api.spotify.com/v1/browse/categories?limit=50', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    if (!res.ok) {
      let errorText = '';
      let errorJson = null;
      try {
        errorText = await res.text();
        try {
          errorJson = JSON.parse(errorText);
        } catch {}
      } catch {}
      console.error('Spotify categories fetch error:', res.status, errorText, errorJson);
      return NextResponse.json({ error: 'Failed to fetch categories from Spotify', details: errorText, json: errorJson }, { status: res.status });
    }
    const data = await res.json();
    // Map categories to genre names
    const genres = (data.categories?.items || []).map((item: any) => item.name);
    return NextResponse.json({ genres });
  } catch (error) {
    const errMsg = typeof error === 'object' && error && 'message' in error ? (error as any).message : String(error);
    console.error('Categories endpoint error:', errMsg);
    return NextResponse.json({ error: 'Failed to fetch categories from Spotify', details: errMsg }, { status: 500 });
  }
}
