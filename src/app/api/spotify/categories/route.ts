// --- Spotify Categories API Route ---

/**
 * API route to fetch available Spotify categories (genres) using a client access token.
 *
 * - Retrieves a client access token from the Spotify service.
 * - Fetches categories from the Spotify API and maps them to genre names.
 * - Handles errors and returns detailed error information if needed.
 *
 * Returns JSON with:
 *   - genres: An array of genre names
 *   - error/details/json: Error information if the request fails
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/services/spotify-service';

/**
 * Handles GET requests to the Spotify categories API route.
 *
 * @param req - NextRequest object
 * @returns NextResponse object
 */
export async function GET(req: NextRequest) {
  try {
    // Retrieve client access token
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

    // Handle non-OK responses
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

    // Parse response data
    const data = await res.json();

    // Map categories to genre names
    const genres = (data.categories?.items || []).map((item: { id: string; name: string }) => item.name);

    // Return genre names
    return NextResponse.json({ genres });
  } catch (error) {
    // Handle endpoint errors
    const errMsg = typeof error === 'object' && error && 'message' in error ? (error as any).message : String(error);
    console.error('Categories endpoint error:', errMsg);
    return NextResponse.json({ error: 'Failed to fetch categories from Spotify', details: errMsg }, { status: 500 });
  }
}
