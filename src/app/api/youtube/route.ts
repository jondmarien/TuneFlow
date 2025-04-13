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

  // Construct the correct API URL for comments
  // Note: YouTube API v3 uses 'commentThreads' endpoint to get top-level comments
  const youtubeApiUrl = \`https://www.googleapis.com/youtube/v3/commentThreads?key=\${apiKey}&videoId=\${videoId}&part=snippet&maxResults=100&order=relevance\`; // Fetch top 100 relevant comments

  try {
    const response = await fetch(youtubeApiUrl, {
       headers: {
         'Accept': 'application/json',
       },
    });

    // Read the response body once
    const data = await response.json();

    // Check if the response status is OK *after* reading the body
    if (!response.ok) {
      console.error('YouTube API Error:', data);
      return NextResponse.json({ error: \`YouTube API error: \${response.statusText}\`, details: data }, { status: response.status });
    }

    // If response is ok, return the data
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching from YouTube API:', error);
    return NextResponse.json({ error: 'Failed to fetch data from YouTube API' }, { status: 500 });
  }
}

// You might need a different endpoint or parameters depending on the exact data needed
// For example, getting video details uses the 'videos' endpoint:
// const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails,statistics`;

