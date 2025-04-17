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
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const { playlistName, description, videoIds } = await req.json();

  if (!session || !(session as any).accessToken) {
    return NextResponse.json({ error: 'Not authenticated with YouTube.' }, { status: 401 });
  }

  const accessToken = (session as any).accessToken;

  // Create playlist
  const createRes = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,status', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      snippet: {
        title: playlistName,
        description: description || '',
      },
      status: { privacyStatus: 'private' },
    }),
  });

  const createData = await createRes.json();
  if (!createRes.ok) {
    return NextResponse.json({ error: createData.error?.message || 'Failed to create playlist', details: createData }, { status: createRes.status });
  }

  const playlistId = createData.id;
  let playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;

  // Optionally add videos to playlist
  if (videoIds && Array.isArray(videoIds) && videoIds.length > 0) {
    for (const videoId of videoIds) {
      await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: {
            playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId,
            },
          },
        }),
      });
    }
  }

  return NextResponse.json({ playlistId, playlistUrl });
}
