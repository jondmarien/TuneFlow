import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/utils/redis';

/**
 * POST /api/clear-failed-songs
 * Request body: { cacheKey: string }
 * Clears the failed songs cache for the given key from Redis.
 */
export async function POST(req: NextRequest) {
  try {
    const { cacheKey } = await req.json();
    if (!cacheKey) {
      return NextResponse.json({ error: 'Missing cacheKey in request body.' }, { status: 400 });
    }
    // Delete the cache entry in Redis
    const redis = getRedis();
    if (!redis) {
      return NextResponse.json({ error: 'Redis not available' }, { status: 503 });
    }
    const result = await redis.del(cacheKey);
    if (result === 0) {
      return NextResponse.json({ message: 'No cache entry found for the provided key.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Failed songs cache cleared successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
  }
}
