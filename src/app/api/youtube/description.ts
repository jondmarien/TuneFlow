import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { videoId } = await request.json();
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 });
  }

  if (!videoId) {
    return NextResponse.json({ error: 'Missing videoId in request body' }, { status: 400 });
  }

  // Construct the correct API URL for video details (snippet includes description)
  const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`;

  try {
    const response = await fetch(youtubeApiUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('YouTube API Error:', data);
      return NextResponse.json({ error: `YouTube API error: ${response.statusText}`, details: data }, { status: response.status });
    }

    const item = data.items?.[0];
    if (!item || !item.snippet) {
      return NextResponse.json({ error: 'No video snippet found for provided videoId' }, { status: 404 });
    }

    const description = item.snippet.description || '';
    return NextResponse.json({ description });
  } catch (error) {
    console.error('Error fetching video description from YouTube API:', error);
    return NextResponse.json({ error: 'Failed to fetch video description from YouTube API' }, { status: 500 });
  }
}
