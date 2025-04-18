// --- YouTube Comments API Route ---
/**
 * API route to fetch comments from a YouTube video using the YouTube Data API.
 *
 * - Accepts a video ID and an optional prioritizePinnedComments flag in the request body.
 * - Can prioritize fetching pinned comments or fetch up to a configurable number of pages of top comments.
 * - Uses the googleapis package for YouTube API access.
 *
 * Request JSON:
 *   - videoId: string (required)
 *   - prioritizePinnedComments: boolean (optional)
 *
 * Returns JSON with:
 *   - comments: Array of { id, author, text, publishedAt }
 *   - error: Error information if the request fails
 */
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { GaxiosResponse } from 'gaxios';
import type { youtube_v3 } from 'googleapis';

// --- YouTube API Client ---
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

/**
 * Handles POST requests to the YouTube comments API route.
 *
 * @param req - Request object
 * @returns NextResponse object
 */
export async function POST(req: Request) {
  try {
    const { videoId, prioritizePinnedComments } = await req.json();

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    // --- Comment Type Definition ---
    interface Comment {
      id: string | undefined;
      author: string | undefined;
      text: string | undefined;
      publishedAt: string | undefined;
    }
    let allComments: Comment[] = [];

    // --- Fetch Pinned Comments ---
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
      // --- Fetch Up To N Comments (Configurable Pages) ---
      const MAX_PAGES = parseInt(process.env.YT_COMMENT_PAGES || '5', 10); // default 5 pages (500 comments)
      let nextPageToken: string | undefined = undefined;
      let fetchedPages = 0;
      do {
        const response: GaxiosResponse<youtube_v3.Schema$CommentThreadListResponse> = await youtube.commentThreads.list({
          part: ['snippet'],
          videoId: videoId,
          maxResults: 100,
          textFormat: 'plainText',
          pageToken: nextPageToken,
          order: 'relevance', // fetch top (most liked) comments first
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
      } while (nextPageToken && fetchedPages < MAX_PAGES);
    }

    return NextResponse.json({ comments: allComments });
  } catch (error) {
    console.error('Error fetching YouTube comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}
