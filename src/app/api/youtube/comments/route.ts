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

    // Fetch comments from YouTube API with pagination
    interface Comment {
      id: string | null | undefined;
      author: string | null | undefined;
      text: string | null | undefined;
      publishedAt: string | null | undefined;
    }
    let allComments: Comment[] = [];
    let nextPageToken = '';
    do {
      const response = await youtube.commentThreads.list({
        part: ['snippet'],
        videoId: videoId,
        maxResults: 100,
        textFormat: 'plainText',
        pageToken: nextPageToken || undefined,
      });

      console.log('YouTube API Response:', {
        totalResults: response.data.pageInfo?.totalResults,
        resultsPerPage: response.data.pageInfo?.resultsPerPage,
        nextPageToken: response.data.nextPageToken,
        itemsLength: response.data.items?.length
      });

      const comments = response.data.items?.map(item => ({
        id: item.id,
        author: item.snippet?.topLevelComment?.snippet?.authorDisplayName,
        text: item.snippet?.topLevelComment?.snippet?.textDisplay,
        publishedAt: item.snippet?.topLevelComment?.snippet?.publishedAt,
      })) || [];

      console.log('Processed comments length for this page:', comments.length);

      allComments = allComments.concat(comments);
      nextPageToken = response.data.nextPageToken || '';
    } while (nextPageToken && allComments.length < 500); // Limit to 500 comments to avoid excessive API calls

    console.log('Total processed comments:', allComments.length);

    return NextResponse.json({ comments: allComments });
  } catch (error) {
    console.error('Error fetching YouTube comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}
