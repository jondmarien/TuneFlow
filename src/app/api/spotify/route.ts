import { NextRequest, NextResponse } from 'next/server';

// TODO: Implement proper refresh token management for long-term access
// See: https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens

// Helper function to get Spotify Access Token (Client Credentials Flow)
async function getSpotifyAccessToken(clientId: string, clientSecret: string) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store' // Ensure fresh token for this simple flow
  });

  const data = await response.json(); // Read body once

  if (!response.ok) {
    console.error('Spotify Token Error:', data);
    // Use details from the read body
    throw new Error(`Failed to retrieve Spotify access token: ${data.error_description || response.statusText}`);
  }

  return data.access_token;
}

export async function POST(request: NextRequest) {
  const { query, type = 'track' } = await request.json(); // Default type to 'track'
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Spotify API credentials not configured' }, { status: 500 });
  }

  if (!query) {
    return NextResponse.json({ error: 'Missing query in request body' }, { status: 400 });
  }

  try {
    // For client credentials flow, we fetch a token for each request batch.
    // For user-specific data, you'd use the Authorization Code Flow with refresh tokens.
    const accessToken = await getSpotifyAccessToken(clientId, clientSecret);

    const spotifyApiUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=10`; // Example: Search endpoint

    const spotifyResponse = await fetch(spotifyApiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    // Read the response body once
    const data = await spotifyResponse.json();

    // Check status after reading
    if (!spotifyResponse.ok) {
      console.error('Spotify API Error:', data);
      return NextResponse.json({ error: `Spotify API error: ${spotifyResponse.statusText}`, details: data }, { status: spotifyResponse.status });
    }

    // Return successful data
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error interacting with Spotify API:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch data from Spotify API' }, { status: 500 });
  }
}

// Add other methods (GET, etc.) or specific endpoints as needed
// e.g., GET for fetching user playlists (requires Authorization Code Flow)