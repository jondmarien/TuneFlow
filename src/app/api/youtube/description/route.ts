import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// Initialize YouTube API client
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

// API route to fetch YouTube video description
export async function POST(req: Request) {
  try {
    const { videoId } = await req.json();

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    // Fetch video details from YouTube API
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
