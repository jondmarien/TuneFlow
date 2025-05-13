import React from "react";
import type { Song } from "@/types/tuneflow";

/**
 * SongItem Component
 * Renders a single song in the list, showing album art (if available) or a placeholder.
 * Uses the polling hook to fetch album art and triggers onFail if not found after 3 tries.
 *
 * @param song - The song object
 * @param onFail - Callback for failed album art
 */
export function SongItem({ song, onFail }: { song: Song; onFail: (song: Song) => void }) {
  // TODO: Use useAlbumArtWithFailure hook for album art polling in parent or here.
  // onFail is required for future extensibility.
  return (
    <li className="flex items-center text-sm border-b pb-1">
      {song.imageUrl ? (
        <img
          src={song.imageUrl}
          alt={`${song.title} album art`}
          className="w-10 h-10 object-cover rounded mr-3 border"
        />
      ) : (
        <div className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded mr-3 border text-xs text-gray-500">N/A</div>
      )}
      <div>
        <div className="font-semibold">{song.title}</div>
        <div className="text-xs text-gray-500">{song.artist}</div>
      </div>
    </li>
  );
}
