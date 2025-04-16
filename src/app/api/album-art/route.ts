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
  let imageUrl = await redis.get(key);

  if (imageUrl) {
    return NextResponse.json({ imageUrl, status: 'ready' });
  }

  // If not cached, trigger fetch in background
  getTrackAlbumArt(title, artist).then(url => {
    if (url) {
      redis.set(key, url, 'EX', 60 * 60 * 24); // Cache for 24 hours
    }
  });

  return NextResponse.json({ imageUrl: null, status: 'pending' });
}
