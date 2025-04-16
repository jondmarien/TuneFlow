import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('spotify_access_token')?.value;
  if (!accessToken) {
    return NextResponse.json({ error: 'No Spotify access token found. Please connect your Spotify account.' }, { status: 401 });
  }

  const { userId, playlistName, trackUris } = await req.json();
  if (!userId || !playlistName || !trackUris || !Array.isArray(trackUris)) {
    return NextResponse.json({ error: 'Missing userId, playlistName, or trackUris' }, { status: 400 });
  }

  // 1. Create the playlist
  const createPlaylistUrl = `https://api.spotify.com/v1/users/${userId}/playlists`;
  const createResponse = await fetch(createPlaylistUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: playlistName, public: true }),
  });
  const playlistData = await createResponse.json();
  if (!createResponse.ok) {
    return NextResponse.json({ error: playlistData.error?.message || 'Failed to create playlist', details: playlistData }, { status: createResponse.status });
  }

  // 2. Add tracks
  const addTracksUrl = `https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`;
  const addResponse = await fetch(addTracksUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uris: trackUris }),
  });
  const addData = await addResponse.json();
  if (!addResponse.ok) {
    return NextResponse.json({ error: addData.error?.message || 'Failed to add tracks', details: addData }, { status: addResponse.status });
  }

  return NextResponse.json({ playlistId: playlistData.id, playlistUrl: playlistData.external_urls?.spotify, snapshot_id: addData.snapshot_id });
}
