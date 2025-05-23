// --- YouTube Chapters API Route ---
/**
 * API route to extract chapter timestamps from a YouTube video.
 *
 * - Accepts a video ID or YouTube URL in the request body.
 * - Attempts to use youtube-chapters-finder for structured chapters.
 * - Falls back to parsing timestamps from the video description using the YouTube Data API.
 *
 * Request JSON:
 *   - videoId: string (optional)
 *   - youtubeUrl: string (optional)
 *
 * Returns JSON with:
 *   - chapters: Array of { start: string, title: string }
 *   - error: Error information if the request fails
 */
import { NextRequest, NextResponse } from 'next/server';

// --- DEPRECATED: youtube-chapters-finder ---
// This code is kept for reference but is no longer used for extracting chapters.
// import chaptersFinder from 'youtube-chapters-finder';

// --- Helper: Extract Video ID ---
/**
 * Extracts the video ID from a YouTube URL or input string.
 * @param input - YouTube URL or video ID
 * @returns Video ID or null
 */
function extractVideoId(input: string): string | null {
  try {
    if (input.includes('watch?v=')) {
      const url = new URL(input.startsWith('http') ? input : 'https://' + input);
      return url.searchParams.get('v');
    } else if (/^[\w-]{11}$/.test(input)) {
      return input; // Already a video ID
    }
    return null;
  } catch {
    return null;
  }
}

// --- Helper: Fetch Video Details ---
/**
 * Fetches video details from the YouTube Data API.
 * @param videoId - YouTube video ID
 * @returns Parsed JSON response from YouTube API
 */
async function fetchVideoDetails(videoId: string) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
  const resp = await fetch(apiUrl);
  if (!resp.ok) throw new Error('YouTube API error');
  return resp.json();
}

// --- Helper: Parse Chapters from Description ---
/**
 * Parses chapter timestamps from a YouTube video description.
 * @param description - Video description string
 * @returns Array of chapter objects
 */
function parseChaptersFromDescription(description: string) {
  const lines = description.split(/\r?\n/);
  // Improved regex: supports dashes, dots, pipes, multiple whitespace, etc.
  const chapterRegex = /^(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—.|]*\s*(.+)$/;
  const chapters: { start: string, title: string }[] = [];
  for (const line of lines) {
    const match = line.match(chapterRegex);
    if (match) {
      chapters.push({ start: match[1], title: match[2].trim() });
    }
  }
  return chapters;
}

/**
 * Handles POST requests to the YouTube chapters API route.
 *
 * @param req - NextRequest object
 * @returns NextResponse object
 */
export async function POST(req: NextRequest) {
  try {
    const { videoId: inputId, youtubeUrl } = await req.json();
    const videoId = extractVideoId(inputId || youtubeUrl);
    if (!videoId) return NextResponse.json({ error: 'Invalid video ID or URL.' }, { status: 400 });

    // --- Previous implementation using youtube-chapters-finder (deprecated, not used) ---
    // try {
    //   const rawChapters = await chaptersFinder.getChapter(videoId);
    //   if (rawChapters && rawChapters.length > 0) {
    //     chapters = rawChapters.map((ch: any) => ({ start: ch.time, title: ch.title }));
    //   }
    // } catch (err) {
    //   const msg = typeof err === 'object' && err && 'message' in err ? (err as any).message : String(err);
    //   console.warn('[Chapters API] youtube-chapters-finder failed:', msg);
    // }

    // --- Now always use parseChaptersFromDescription fallback ---
    let chapters: { start: string, title: string }[] = [];
    try {
      const data = await fetchVideoDetails(videoId);
      const item = data.items?.[0];
      if (item && item.snippet?.description) {
        chapters = parseChaptersFromDescription(item.snippet.description);
      }
    } catch (err) {
      // Ignore
    }

    if (!chapters.length) {
      return NextResponse.json({ chapters: [] });
    }

    return NextResponse.json({ chapters });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
