// --- Spotify Playlist API Route ---

/**
 * API route to create a new Spotify playlist and add tracks to it for the authenticated user.
 *
 * - Expects userId, playlistName, and trackUris in the request body.
 * - Creates a playlist and adds the provided tracks.
 * - Requires a valid Spotify access token in cookies.
 *
 * Request JSON:
 *   - userId: string (required)
 *   - playlistName: string (required)
 *   - trackUris: string[] (required)
 *   - public: boolean (optional, defaults to true)
 *
 * Returns JSON with:
 *   - playlistId: string
 *   - playlistUrl: string
 *   - snapshot_id: string
 *   - error/details: Error information if the request fails
 */

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles POST requests to the Spotify Playlist API route.
 *
 * @param req - NextRequest object
 * @returns NextResponse object
 */
export async function POST(req: NextRequest) {
  // Get Spotify access token from cookies
  const cookieStore = await cookies();
  // Only use the Spotify access token for Spotify API calls
  const accessToken = cookieStore.get('spotify_access_token')?.value;

  // Check if access token is present
  if (!accessToken) {
    return NextResponse.json({ error: 'No Spotify access token found. Please connect your Spotify account.' }, { status: 401 });
  }

  // Parse request body
  let userId, playlistName, trackUris, isPublic;
  try {
    const body = await req.json();
    userId = body.userId;
    playlistName = body.playlistName;
    trackUris = body.trackUris;
    isPublic = typeof body.public === 'boolean' ? body.public : true;
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  // Validate request body
  if (!userId || typeof userId !== 'string' || !playlistName || typeof playlistName !== 'string' || !trackUris || !Array.isArray(trackUris) || trackUris.length === 0) {
    return NextResponse.json({ error: 'Missing or invalid userId, playlistName, or trackUris' }, { status: 400 });
  }

  // --- Create Playlist ---

  // Construct create playlist URL
  const createPlaylistUrl = `https://api.spotify.com/v1/users/${userId}/playlists`;

  // Create playlist request
  const createResponse = await fetch(createPlaylistUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: playlistName, public: isPublic, description: 'Created by TuneFlow. With <3 from Jon. https://tuneflow.chron0.tech' }),
  });

  // Parse create playlist response
  const playlistData = await createResponse.json();

  // Check if create playlist request failed
  if (!createResponse.ok) {
    return NextResponse.json({ error: playlistData.error?.message || 'Failed to create playlist', details: playlistData }, { status: createResponse.status });
  }

  // --- Add Tracks ---

  // Construct add tracks URL
  const addTracksUrl = `https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`;

  // Add tracks request
  const addResponse = await fetch(addTracksUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uris: trackUris }),
  });

  // Parse add tracks response
  const addData = await addResponse.json();

  // Check if add tracks request failed
  if (!addResponse.ok) {
    return NextResponse.json({ error: addData.error?.message || 'Failed to add tracks', details: addData }, { status: addResponse.status });
  }

  // Return playlist data
  return NextResponse.json({ playlistId: playlistData.id, playlistUrl: playlistData.external_urls?.spotify, snapshot_id: addData.snapshot_id });
}
