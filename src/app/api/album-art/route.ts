// --- Album Art API Route ---

/**
 * API route to fetch and cache Spotify album art for a given track.
 *
 * - Checks Redis cache for existing album art URL.
 * - If not cached, triggers a background fetch and caches the result.
 * - Uses deduplication to avoid redundant fetches.
 *
 * Query Parameters:
 *   - title: Track title (required)
 *   - artist: Track artist (required)
 *
 * Returns JSON with:
 *   - imageUrl: Album art URL or null
 *   - status: 'ready', 'pending', or 'redis_error'
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTrackAlbumArt } from '@/services/spotify-service';
import { redis } from '@/utils/redis';
import { withRequestContext } from '../_logcontext';

/**
 * Handles GET requests to the album art API route.
 *
 * @param req - NextRequest object
 * @returns NextResponse object
 */
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown-ip';
  return withRequestContext(ip, async () => {
    console.log('GET /api/album-art');
    // --- Parse Request Parameters ---

    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title');
    const artist = searchParams.get('artist');

    // --- Validate Request Parameters ---

    if (!title || !artist) {
      return NextResponse.json({ error: 'Missing title or artist' }, { status: 400 });
    }

    // --- Check Redis Cache ---

    const key = `albumArt:${title}|||${artist}`;
    let imageUrl: string | null = null;
    try {
      imageUrl = await redis.get(key);
    } catch (err) {
      console.error('[album-art] Redis error:', err);
      return NextResponse.json({ imageUrl: null, status: 'redis_error' });
    }

    // --- Return Cached Result ---

    if (imageUrl) {
      return NextResponse.json({ imageUrl, status: 'ready' });
    }

    // --- Deduplication: Check Fetching Lock ---

    const fetchingKey = `albumArt:fetching:${title}|||${artist}`;
    let isFetching = false;
    try {
      isFetching = !!(await redis.get(fetchingKey));
    } catch (err) {
      console.error('[album-art] Redis error checking fetching lock:', err);
    }

    // --- Trigger Background Fetch ---

    if (!isFetching) {
      await redis.set(fetchingKey, '1', 'EX', 30); // lock for 30 seconds
      getTrackAlbumArt(title, artist).then(url => {
        if (url) {
          redis.set(key, url, 'EX', 60 * 60 * 24); // Cache for 24 hours
        }
        redis.del(fetchingKey);
      });
    }

    // --- Return Pending Response ---

    return NextResponse.json({ imageUrl: null, status: 'pending' });
  });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown-ip';
  return withRequestContext(ip, async () => {
    console.log('POST /api/album-art');
    // No POST logic implemented
    return NextResponse.json({ error: 'POST not implemented' }, { status: 405 });
  });
}
