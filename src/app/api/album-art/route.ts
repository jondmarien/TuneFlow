import { NextRequest, NextResponse } from 'next/server';
import { getTrackAlbumArt } from '@/services/spotify-service';
import { redis } from '@/utils/redis';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title');
  const artist = searchParams.get('artist');

  if (!title || !artist) {
    return NextResponse.json({ error: 'Missing title or artist' }, { status: 400 });
  }

  const key = `albumArt:${title}|||${artist}`;
  let imageUrl: string | null = null;
  try {
    imageUrl = await redis.get(key);
  } catch (err) {
    console.error('[album-art] Redis error:', err);
    return NextResponse.json({ imageUrl: null, status: 'redis_error' });
  }

  if (imageUrl) {
    return NextResponse.json({ imageUrl, status: 'ready' });
  }

  // Deduplication: Only trigger background fetch if not already in progress
  const fetchingKey = `albumArt:fetching:${title}|||${artist}`;
  let isFetching = false;
  try {
    isFetching = !!(await redis.get(fetchingKey));
  } catch (err) {
    console.error('[album-art] Redis error checking fetching lock:', err);
  }

  if (!isFetching) {
    await redis.set(fetchingKey, '1', 'EX', 30); // lock for 30 seconds
    getTrackAlbumArt(title, artist).then(url => {
      if (url) {
        redis.set(key, url, 'EX', 60 * 60 * 24); // Cache for 24 hours
      }
      redis.del(fetchingKey);
    });
  }

  return NextResponse.json({ imageUrl: null, status: 'pending' });
}
