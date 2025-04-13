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
  /**
   * Indicates whether the comment is pinned.
   */
  pinned: boolean;
}

/**
 * Retrieves comments from a YouTube video.
 *
 * @param videoId The ID of the YouTube video.
 * @returns A promise that resolves to an array of YouTube comments.
 */
export async function getVideoComments(videoId: string): Promise<YouTubeComment[]> {
  // TODO: Implement this by calling an API.
  return [
    {
      id: 'UgwBWYFk8W7j_8NdzJF4AaABAg',
      text: 'Great song!',
      pinned: false,
    },
    {
      id: 'UgwBWYFk8W7j_8NdzJF4AaABAg2',
      text: 'This is my favorite song.',
      pinned: true,
    },
  ];
}

/**
 * Retrieves a specific YouTube comment.
 *
 * @param commentUrl The URL of the YouTube comment.
 * @returns A promise that resolves to a YouTube comment.
 */
export async function getComment(commentUrl: string): Promise<YouTubeComment> {
  // TODO: Implement this by calling an API.
  return {
    id: 'UgwBWYFk8W7j_8NdzJF4AaABAg',
    text: 'I love this song!',
    pinned: false,
  };
}
