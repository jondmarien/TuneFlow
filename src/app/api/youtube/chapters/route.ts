import { NextRequest, NextResponse } from 'next/server';
import chaptersFinder from 'youtube-chapters-finder';

// Helper to extract video ID from URL or input
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

// Helper to fetch video details from YouTube Data API
async function fetchVideoDetails(videoId: string) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
  const resp = await fetch(apiUrl);
  if (!resp.ok) throw new Error('YouTube API error');
  return resp.json();
}

// Helper to parse chapters from description (timestamps)
function parseChaptersFromDescription(description: string) {
  const lines = description.split(/\r?\n/);
  const chapterRegex = /^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)/;
  const chapters: { start: string, title: string }[] = [];
  for (const line of lines) {
    const match = line.match(chapterRegex);
    if (match) {
      chapters.push({ start: match[1], title: match[2].trim() });
    }
  }
  return chapters;
}

export async function POST(req: NextRequest) {
  try {
    const { videoId: inputId, youtubeUrl } = await req.json();
    const videoId = extractVideoId(inputId || youtubeUrl);
    if (!videoId) return NextResponse.json({ error: 'Invalid video ID or URL.' }, { status: 400 });

    // Try youtube-chapters-finder first
    let chapters: { start: string, title: string }[] = [];
    try {
      const rawChapters = await chaptersFinder.getChapter(videoId);
      if (rawChapters && rawChapters.length > 0) {
        chapters = rawChapters.map((ch: any) => ({ start: ch.time, title: ch.title }));
      }
    } catch (err) {
      const msg = typeof err === 'object' && err && 'message' in err ? (err as any).message : String(err);
      console.warn('[Chapters API] youtube-chapters-finder failed:', msg);
    }

    // Fallback: parse from description if no chapters found
    if (!chapters.length) {
      try {
        const data = await fetchVideoDetails(videoId);
        const item = data.items?.[0];
        if (item && item.snippet?.description) {
          chapters = parseChaptersFromDescription(item.snippet.description);
        }
      } catch (err) {
        // Ignore
      }
    }

    // Restore previous fallback logic
    if (!chapters.length) {
      return NextResponse.json({ chapters: [] });
    }

    return NextResponse.json({ chapters });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
