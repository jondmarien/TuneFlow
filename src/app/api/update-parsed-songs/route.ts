import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/utils/redis';

/**
 * POST /api/update-parsed-songs
 * Request body: { videoId: string, songs: Song[] }
 * Updates the parsed songs cache for the given videoId in Redis.
 */
export async function POST(req: NextRequest) {
  try {
    const { videoId, songs } = (await req.json()) as { videoId: string, songs: { id: string, title: string, artist: string }[] };
    if (!videoId || !Array.isArray(songs)) {
      return NextResponse.json({ error: 'Missing videoId or songs in request body.' }, { status: 400 });
    }
    // Standardized cache key for parsed songs
    const cacheKey = `parsed_songs:${videoId}`;
    await redis.set(cacheKey, JSON.stringify(songs), 'EX', 60 * 60 * 24); // cache for 24 hours
    return NextResponse.json({ message: 'Parsed songs cache updated successfully.' });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error.' }, { status: 500 });
  }
}
