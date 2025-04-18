import { useState, useEffect } from "react";
import type { Song } from "@/types/tuneflow";

/**
 * Custom React Hook: useAlbumArtWithFailure
 *
 * Polls the /api/album-art endpoint for a song's album art up to 3 times.
 * If album art is not found after 3 attempts, triggers onFail callback.
 *
 * @param song - The song object (title, artist, etc.)
 * @param onFail - Callback to call if album art fails after 3 tries
 * @returns imageUrl - The album art URL (if found)
 */
export function useAlbumArtWithFailure(song: Song, onFail: (song: Song) => void) {
  const [imageUrl, setImageUrl] = useState<string | null>(song.imageUrl ?? null);
  const [failCount, setFailCount] = useState(0);

  useEffect(() => {
    if (imageUrl || failCount >= 3) return;
    let cancelled = false;

    async function poll() {
      const res = await fetch(`/api/album-art?title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}`);
      const data = await res.json();
      if (cancelled) return;
      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
      } else {
        if (failCount < 2) {
          setTimeout(poll, 2000);
          setFailCount((c) => c + 1);
        } else {
          setFailCount((c) => c + 1);
          onFail(song);
        }
      }
    }

    poll();
    return () => { cancelled = true; };
  }, [song.title, song.artist, imageUrl, failCount]);

  return imageUrl;
}
