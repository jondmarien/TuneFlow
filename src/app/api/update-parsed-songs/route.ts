import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/utils/redis';

/**
 * POST /api/update-parsed-songs
 * Request body: { videoId: string, songs: Song[] }
 * Updates the parsed songs cache for the given videoId in Redis.
 */
export async function POST(req: NextRequest) {
  try {
    const { videoId, songs } = await req.json();
    if (!videoId || !Array.isArray(songs)) {
      return NextResponse.json({ error: 'Missing videoId or songs in request body.' }, { status: 400 });
    }
    // Standardized cache key for parsed songs
    const cacheKey = `parsed_songs:${videoId}`;
    const redis = getRedis();
    if (!redis) {
      return NextResponse.json({ error: 'Redis not available' }, { status: 503 });
    }
    await redis.set(cacheKey, JSON.stringify(songs), 'EX', 60 * 60 * 24); // cache for 24 hours
    return NextResponse.json({ message: 'Parsed songs cache updated successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
  }
}
