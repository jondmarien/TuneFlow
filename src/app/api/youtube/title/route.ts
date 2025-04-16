import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

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
