import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// Initialize YouTube API client
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

// API route to fetch YouTube comments
export async function POST(req: Request) {
  try {
    const { videoId } = await req.json();

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    // Fetch comments from YouTube API
    const response = await youtube.commentThreads.list({
      part: ['snippet'],
      videoId: videoId,
      maxResults: 100, // Adjust as needed
      textFormat: 'plainText',
    });

    const comments = response.data.items?.map(item => ({
      id: item.id,
      author: item.snippet?.topLevelComment?.snippet?.authorDisplayName,
      text: item.snippet?.topLevelComment?.snippet?.textDisplay,
      publishedAt: item.snippet?.topLevelComment?.snippet?.publishedAt,
    })) || [];

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error fetching YouTube comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}
