import React from "react";
import type { Song } from "@/types/tuneflow";
import { SongItem } from "./SongItem";
import { hashSong } from "@/utils/formatters";

/**
 * SongList Component
 * Renders a list of songs using the SongItem component.
 * Ensures unique keys by using videoId if available, otherwise falls back to array index.
 * @param songs - Array of Song objects
 * @param onFail - Callback for failed album art (passed to each SongItem)
 */
export function SongList({ songs, onFail }: { songs: Song[]; onFail: (song: Song) => void }) {
  return (
    <ul className="space-y-2 max-h-60 overflow-y-auto">
      {songs.map((song, idx) => {
        // Prefer videoId if set and non-empty, otherwise fallback to hashSong+idx
        const key = song.videoId && song.videoId.trim() ? song.videoId : hashSong(song) + '|' + idx;
        return <SongItem key={key} song={song} onFail={onFail} />;
      })}
    </ul>
  );
}
