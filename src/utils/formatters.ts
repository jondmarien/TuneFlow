import type { Song } from "@/types/tuneflow";

/**
 * Hashes a song for use as a React key or identifier.
 * Uses title, artist, and videoId for uniqueness.
 */
export function hashSong(song: Song): string {
  return `${song.title}|${song.artist}|${song.videoId ?? ''}`;
}

/**
 * Formats a song for display (title by artist).
 */
export function formatSongDisplay(song: Song): string {
  return `${song.title} by ${song.artist}`;
}
