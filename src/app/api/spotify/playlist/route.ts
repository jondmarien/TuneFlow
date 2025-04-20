// --- Spotify Playlist API Route ---

/**
 * API route to create a new Spotify playlist and add tracks to it for the authenticated user.
 *
 * - Expects playlistName, and trackUris in the request body.
 * - Creates a playlist and adds the provided tracks.
 * - Requires a valid Spotify access token in cookies.
 *
 * Request JSON:
 *   - playlistName: string (required)
 *   - trackUris: string[] (required)
 *   - public: boolean (optional, defaults to true)
 *
 * Returns JSON with:
 *   - playlistId: string
 *   - playlistUrl: string
 *   - error/details: Error information if the request fails
 */

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { SpotifyApi, AccessToken } from '@spotify/web-api-ts-sdk';

/**
 * Handles POST requests to the Spotify Playlist API route.
 *
 * @param req - NextRequest object
 * @returns NextResponse object
 */
export async function POST(req: NextRequest) {
  // Get Spotify access token from cookies
  const cookieStore = await cookies();
  // Retrieve the full AccessToken object as JSON from cookies
  const accessTokenJson = cookieStore.get('spotify_access_token')?.value;
  let accessToken: AccessToken | null = null;
  try {
    accessToken = accessTokenJson ? JSON.parse(accessTokenJson) : null;
  } catch {
    accessToken = null;
  }

  if (!accessToken || !accessToken.access_token) {
    return NextResponse.json({ error: 'No valid Spotify access token found. Please connect your Spotify account.' }, { status: 401 });
  }

  // Parse request body
  let playlistName, trackUris, isPublic;
  try {
    const body = await req.json();
    playlistName = body.playlistName;
    trackUris = body.trackUris;
    isPublic = typeof body.public === 'boolean' ? body.public : true;
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  // Validate request body
  if (!playlistName || typeof playlistName !== 'string' || !trackUris || !Array.isArray(trackUris) || trackUris.length === 0) {
    return NextResponse.json({ error: 'Missing or invalid playlistName or trackUris' }, { status: 400 });
  }

  try {
    // Initialize Spotify SDK with AccessToken object
    const sdk = SpotifyApi.withAccessToken('client-id', accessToken);

    // Get current user's Spotify profile to obtain user ID
    const user = await sdk.currentUser.profile();

    // Create playlist for current user
    const playlist = await sdk.playlists.createPlaylist(user.id, {
      name: playlistName,
      public: isPublic,
      description: 'Created by TuneFlow. With <3 from Jon. https://tuneflow.chron0.tech',
    });

    // Add tracks to playlist (no snapshot_id returned)
    await sdk.playlists.addItemsToPlaylist(playlist.id, trackUris);

    return NextResponse.json({
      playlistId: playlist.id,
      playlistUrl: playlist.external_urls?.spotify,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Spotify API error', details: error }, { status: 500 });
  }
}
