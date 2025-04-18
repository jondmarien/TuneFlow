import React from "react";
import type { Song } from "@/types/tuneflow";
import { SongItem } from "./SongItem";

/**
 * SongList Component
 * Renders a list of songs using the SongItem component.
 * @param songs - Array of Song objects
 * @param onFail - Callback for failed album art (passed to each SongItem)
 */
export function SongList({ songs, onFail }: { songs: Song[]; onFail: (song: Song) => void }) {
  return (
    <ul className="space-y-2 max-h-60 overflow-y-auto">
      {songs.map((song) => (
        <SongItem key={`${song.title}-${song.artist}`} song={song} onFail={onFail} />
      ))}
    </ul>
  );
}
