/**
 * Represents a YouTube comment.
 */
export interface YouTubeComment {
  /**
   * The ID of the comment.
   */
  id: string;
  /**
   * The text content of the comment.
   */
  text: string;
}

/**
 * Retrieves comments from a YouTube video.
 *
 * @param videoId The ID of the YouTube video.
 * @param getPinnedOnly Optional flag to retrieve only the pinned comment (if any).
 * @returns A promise that resolves to an array of YouTube comments.
 */
export async function getVideoComments(
  videoId: string,
  getPinnedOnly?: boolean
): Promise<YouTubeComment[]> {
  const apiKey = 'YOUR_API_KEY';
  let url: string;

  if (getPinnedOnly) {
    // Prioritize pinned comment by fetching only the most relevant comment thread.
    url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=1&key=${apiKey}`;
  } else {
    // Regular comment fetching - retrieve all comments (up to maxResults).
    url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&key=${apiKey}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result || !result.items || result.items.length === 0) {
      return []; // No comments found
    }

    // Extract comments from the items.
    const comments: YouTubeComment[] = result.items.map((item: any) => {
      const comment = item.snippet.topLevelComment.snippet;
      return {
        id: comment.id,
        text: comment.textDisplay,
      };
    });

    if (getPinnedOnly) {
      // If fetching pinned only, return the first comment (if any).
      return comments.length > 0 ? [comments[0]] : [];
    } else {
      return comments;
    }
  } catch (error) {
    console.error('Error fetching YouTube comments:', error);
    return [];
  }
}
