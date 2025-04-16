// --- YouTube Title API Route ---
/**
 * API route to fetch the title of a YouTube video using the YouTube Data API.
 *
 * - Accepts a video ID in the request body.
 * - Uses the googleapis package for YouTube API access.
 *
 * Request JSON:
 *   - videoId: string (required)
 *
 * Returns JSON with:
 *   - title: string
 *   - error: Error information if the request fails
 */

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// --- YouTube API Client ---
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

/**
 * Handles POST requests to the YouTube title API route.
 *
 * @param req - NextRequest object
 * @returns NextResponse object
 */
export async function POST(req: NextRequest) {
  try {
    const { videoId } = await req.json();
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }
    const response = await youtube.videos.list({
      part: ['snippet'],
      id: [videoId],
    });
    const video = response.data.items?.[0];
    const title = video?.snippet?.title || '';
    return NextResponse.json({ title });
  } catch (error) {
    console.error('Error fetching YouTube video title:', error);
    return NextResponse.json({ error: 'Failed to fetch video title' }, { status: 500 });
  }
}
