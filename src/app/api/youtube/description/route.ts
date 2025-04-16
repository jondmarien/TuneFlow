// --- YouTube Description API Route ---
/**
 * API route to fetch the description of a YouTube video using the YouTube Data API.
 *
 * - Accepts a video ID in the request body.
 * - Uses the googleapis package for YouTube API access.
 *
 * Request JSON:
 *   - videoId: string (required)
 *
 * Returns JSON with:
 *   - description: string
 *   - error: Error information if the request fails
 */
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// --- YouTube API Client ---
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

/**
 * Handles POST requests to the YouTube description API route.
 *
 * @param req - Request object
 * @returns NextResponse object
 */
export async function POST(req: Request) {
  try {
    const { videoId } = await req.json();

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    // --- Fetch Video Details ---
    const response = await youtube.videos.list({
      part: ['snippet'],
      id: [videoId],
    });

    const video = response.data.items?.[0];
    const description = video?.snippet?.description || '';

    return NextResponse.json({ description });
  } catch (error) {
    console.error('Error fetching YouTube video description:', error);
    return NextResponse.json({ error: 'Failed to fetch video description' }, { status: 500 });
  }
}
