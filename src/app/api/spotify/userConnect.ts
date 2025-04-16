import { NextRequest, NextResponse } from 'next/server';

// TODO: Implement proper refresh token management for long-term access using Authorization Code Flow
// See: https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens
// Client Credentials flow used here CANNOT create user playlists.

// Helper function to get Spotify Access Token (Client Credentials Flow)
async function getSpotifyAccessToken(clientId: string, clientSecret: string) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store' // Ensure fresh token
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    console.error('Spotify Token API did not return JSON:', text);
    throw new Error('Spotify Token API did not return JSON');
  }

  if (!response.ok) {
    console.error('Spotify Token Error:', data);
    throw new Error(`Failed to retrieve Spotify access token: ${data.error_description || response.statusText}`);
  }

  return data.access_token;
}

// Main handler for POST requests
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Spotify API credentials not configured' }, { status: 500 });
  }

  try {
    const accessToken = await getSpotifyAccessToken(clientId, clientSecret);

    if (action === 'search') {
      const { query, type = 'track' } = body;
      if (!query) {
        return NextResponse.json({ error: 'Missing query for search action' }, { status: 400 });
      }
      const spotifyApiUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=1`;
      const spotifyResponse = await fetch(spotifyApiUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const text = await spotifyResponse.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error('Spotify Search API did not return JSON:', text);
        return NextResponse.json({ error: 'Spotify API did not return JSON', raw: text }, { status: 502 });
      }
      if (!spotifyResponse.ok) {
        console.error('Spotify Search API Error:', data);
        return NextResponse.json({ error: `Spotify API error: ${spotifyResponse.statusText}`, details: data }, { status: spotifyResponse.status });
      }
      return NextResponse.json(data);
    }
    else if (action === 'create_playlist') {
      const { userId, playlistName, trackUris } = body;
      if (!userId || !playlistName || !trackUris || !Array.isArray(trackUris)) {
        return NextResponse.json({ error: 'Missing userId, playlistName, or trackUris for create_playlist action' }, { status: 400 });
      }

      // **** WARNING: This section WILL likely fail with 403 Forbidden ****
      // **** Client Credentials tokens CANNOT create user playlists. Requires Authorization Code Flow. ****
      console.warn('Attempting playlist creation with Client Credentials token. This requires user authorization (Authorization Code Flow) to succeed.');

      // 1. Create the playlist
      const createPlaylistUrl = `https://api.spotify.com/v1/users/${userId}/playlists`;
      const createResponse = await fetch(createPlaylistUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: playlistName, public: false }),
      });
      const createText = await createResponse.text();
      let playlistData;
      try {
        playlistData = JSON.parse(createText);
      } catch (err) {
        console.error('Spotify Create Playlist API did not return JSON:', createText);
        return NextResponse.json({ error: 'Spotify Create Playlist API did not return JSON', raw: createText }, { status: 502 });
      }
      if (!createResponse.ok) {
        console.error('Spotify Create Playlist API Error:', playlistData);
        return NextResponse.json({ error: `Spotify API error: ${createResponse.statusText}`, details: playlistData }, { status: createResponse.status });
      }
      // 2. Add tracks to the playlist
      const addTracksUrl = `https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`;
      const addResponse = await fetch(addTracksUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: trackUris }),
      });
      const addText = await addResponse.text();
      let addData;
      try {
        addData = JSON.parse(addText);
      } catch (err) {
        console.error('Spotify Add Tracks API did not return JSON:', addText);
        return NextResponse.json({ error: 'Spotify Add Tracks API did not return JSON', raw: addText }, { status: 502 });
      }
      if (!addResponse.ok) {
        console.error('Spotify Add Tracks API Error:', addData);
        return NextResponse.json({ error: `Spotify API error: ${addResponse.statusText}`, details: addData }, { status: addResponse.status });
      }
      return NextResponse.json({ playlistId: playlistData.id, snapshot_id: addData.snapshot_id });
    }
    else {
      return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Error interacting with Spotify API:', error);
    return NextResponse.json({ error: error.message || 'Failed to process Spotify request' }, { status: 500 });
  }
}
