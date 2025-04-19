// --- YouTube Playlist Creation API Route ---
/**
 * API route to create a new YouTube playlist for the authenticated user.
 *
 * - Expects a playlist name and (optionally) a description and videoIds in the request body.
 * - Uses the user's Google OAuth access token from next-auth session.
 *
 * Request JSON:
 *   - playlistName: string (required)
 *   - description: string (optional)
 *   - videoIds: string[] (optional, to add to playlist)
 *
 * Returns JSON with:
 *   - playlistId: string
 *   - playlistUrl: string
 *   - error: Error information if the request fails
 *   - videoInsertResults: array of results for each attempted video insertion
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../pages/api/auth/[...nextauth]';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const playlistData = (await req.json()) as { playlistName: string, description: string, videoIds: string[] };

  if (!session || !(session as any).accessToken) {
    return NextResponse.json({ error: 'Not authenticated with YouTube.' }, { status: 401 });
  }

  const accessToken = (session as any).accessToken;

  // Production: Create playlist with branding description, emoji, URL, and public privacy
  const playlistPayload = {
    snippet: {
      title: playlistData.playlistName || 'TuneFlow Playlist',
      description: 'Created by TuneFlow. With 💜 from Jon. https://tuneflow.chron0.tech'
    },
    status: { privacyStatus: 'public' }
  };
  console.log('YouTube playlist creation payload (production):', playlistPayload);

  const createRes = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,status', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(playlistPayload),
  });
  const createData = await createRes.json();
  if (!createRes.ok) {
    console.error('YouTube playlist creation error (production):', createData);
    return NextResponse.json({ error: createData.error?.message || 'Failed to create playlist', details: createData }, { status: createRes.status });
  }

  const playlistId = createData.id;
  const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;

  // --- Debug: Log incoming videoIds and validate structure ---
  console.log('Raw videoIds input:', playlistData.videoIds);
  const validatedIds: string[] = [];
  if (playlistData.videoIds && Array.isArray(playlistData.videoIds)) {
    for (const id of playlistData.videoIds as Array<string | { videoId: string }>) {
      if (typeof id === 'string') {
        const trimmed = id.trim();
        // YouTube video IDs are typically 11 characters, alphanumeric, sometimes - or _
        const valid = /^[a-zA-Z0-9_-]{11}$/.test(trimmed);
        if (!valid) {
          console.warn('Invalid video ID format:', id);
        }
        validatedIds.push(trimmed);
      } else if (id && typeof id === 'object' && 'videoId' in id && typeof (id as { videoId?: unknown }).videoId === 'string') {
        const trimmed = (id as { videoId: string }).videoId.trim();
        const valid = /^[a-zA-Z0-9_-]{11}$/.test(trimmed);
        if (!valid) {
          console.warn('Invalid video ID format (object):', id);
        }
        validatedIds.push(trimmed);
      } else {
        console.warn('Unrecognized videoId entry:', id);
      }
    }
  }
  console.log('Validated videoIds:', validatedIds);

  // To avoid 'never' type inference, explicitly type validatedIds as string[] and ensure idsToInsert is string[]
  const idsToInsert: string[] = validatedIds.length > 0 ? validatedIds : ['Y35Vxvd5SW4'];

  const videoInsertResults: { videoId: string, status: number, error?: string, response?: any, payload?: any }[] = [];
  for (const videoId of idsToInsert) {
    const insertPayload = {
      snippet: {
        playlistId,
        resourceId: {
          kind: 'youtube#video',
          videoId,
        },
      },
    };
    try {
      console.log('Inserting video to playlist:', { videoId, insertPayload });
      const insertRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(insertPayload),
      });
      const insertData = await insertRes.json();
      if (!insertRes.ok) {
        console.error('Failed to insert video:', { videoId, status: insertRes.status, error: insertData, payload: insertPayload });
        videoInsertResults.push({ videoId, status: insertRes.status, error: insertData.error?.message || 'Failed to add video', response: insertData, payload: insertPayload });
      } else {
        console.log('Successfully inserted video:', { videoId, status: insertRes.status, response: insertData });
        videoInsertResults.push({ videoId, status: insertRes.status, response: insertData, payload: insertPayload });
      }
    } catch (err: unknown) {
      console.error('Exception inserting video:', { videoId, error: err instanceof Error ? err.message : String(err), payload: insertPayload });
      videoInsertResults.push({ videoId, status: 0, error: err instanceof Error ? err.message : String(err), payload: insertPayload });
    }
  }

  return NextResponse.json({ playlistId, playlistUrl, videoInsertResults });
}
