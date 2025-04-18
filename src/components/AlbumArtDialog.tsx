import React from 'react';

// --- Album Art Fallback Helper ---
// Try iTunes API as a fallback for failed album art
export async function fetchFallbackAlbumArt(song: { title: string; artist: string }): Promise<string | null> {
  // 1. Try iTunes
  try {
    const query = encodeURIComponent(`${song.title} ${song.artist}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=1`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results[0] && data.results[0].artworkUrl100) {
        // iTunes returns 100x100, can upgrade to 600x600
        return data.results[0].artworkUrl100.replace('100x100', '600x600');
      }
    }
  } catch {}
  // 2. Try MusicBrainz + Cover Art Archive
  try {
    // Step 1: Find release via MusicBrainz search
    const mbSearchUrl = `https://musicbrainz.org/ws/2/release/?query=release:${encodeURIComponent(song.title)}%20AND%20artist:${encodeURIComponent(song.artist)}&fmt=json&limit=1`;
    const mbRes = await fetch(mbSearchUrl, { headers: { 'Accept': 'application/json' } });
    if (mbRes.ok) {
      const mbData = await mbRes.json();
      if (mbData.releases && mbData.releases[0] && mbData.releases[0].id) {
        const mbid = mbData.releases[0].id;
        // Step 2: Get cover art from Cover Art Archive
        const caaUrl = `https://coverartarchive.org/release/${mbid}`;
        const caaRes = await fetch(caaUrl);
        if (caaRes.ok) {
          const caaData = await caaRes.json();
          if (caaData.images && caaData.images.length > 0) {
            // Prefer front image thumbnail, fallback to first image
            const front = caaData.images.find((img: any) => img.front) || caaData.images[0];
            if (front.thumbnails && front.thumbnails["500"]) return front.thumbnails["500"];
            if (front.thumbnails && front.thumbnails["250"]) return front.thumbnails["250"];
            if (front.image) return front.image;
          }
        }
      }
    }
  } catch {}
  // If all fail
  return null;
}

// (Optional) Placeholder for a dialog component to display album art if needed
export const AlbumArtDialog = () => null;
