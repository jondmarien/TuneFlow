import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { GaxiosResponse } from 'gaxios';
import type { youtube_v3 } from 'googleapis';

// Initialize YouTube API client
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

// API route to fetch YouTube comments
export async function POST(req: Request) {
  try {
    const { videoId, prioritizePinnedComments } = await req.json();

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    // Fetch comments from YouTube API
    interface Comment {
      id: string | undefined;
      author: string | undefined;
      text: string | undefined;
      publishedAt: string | undefined;
    }
    let allComments: Comment[] = [];

    // If prioritizing pinned comments, only fetch the first page and filter for pinned
    if (prioritizePinnedComments) {
      const response: GaxiosResponse<youtube_v3.Schema$CommentThreadListResponse> = await youtube.commentThreads.list({
        part: ['snippet'],
        videoId: videoId,
        maxResults: 100,
        textFormat: 'plainText',
      });
      // 'pinned' is not in the official typings, so we cast the snippet as any
      const pinnedComments = (response.data.items || []).filter((item: youtube_v3.Schema$CommentThread) =>
        ((item.snippet?.topLevelComment?.snippet as any)?.pinned === true)
      ).map((item: youtube_v3.Schema$CommentThread) => ({
        id: item.id ?? undefined,
        author: item.snippet?.topLevelComment?.snippet?.authorDisplayName ?? undefined,
        text: item.snippet?.topLevelComment?.snippet?.textDisplay ?? undefined,
        publishedAt: item.snippet?.topLevelComment?.snippet?.publishedAt ?? undefined,
      }));
      allComments = pinnedComments;
    } else {
      // Not prioritizing pinned: fetch up to 2 pages (max 200 comments)
      let nextPageToken: string | undefined = undefined;
      let fetchedPages = 0;
      do {
        const response: GaxiosResponse<youtube_v3.Schema$CommentThreadListResponse> = await youtube.commentThreads.list({
          part: ['snippet'],
          videoId: videoId,
          maxResults: 100,
          textFormat: 'plainText',
          pageToken: nextPageToken,
        });
        const comments = (response.data.items || []).map((item: youtube_v3.Schema$CommentThread) => ({
          id: item.id ?? undefined,
          author: item.snippet?.topLevelComment?.snippet?.authorDisplayName ?? undefined,
          text: item.snippet?.topLevelComment?.snippet?.textDisplay ?? undefined,
          publishedAt: item.snippet?.topLevelComment?.snippet?.publishedAt ?? undefined,
        }));
        allComments = allComments.concat(comments);
        nextPageToken = response.data.nextPageToken ?? undefined;
        fetchedPages += 1;
      } while (nextPageToken && fetchedPages < 2);
    }

    return NextResponse.json({ comments: allComments });
  } catch (error) {
    console.error('Error fetching YouTube comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}
