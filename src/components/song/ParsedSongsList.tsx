import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SongList } from "@/components/song/SongList";
import type { Song } from "@/types/tuneflow";
import { hashSong } from "@/utils/formatters";

interface ParsedSongsListProps {
  songs: Song[];
  onClear: () => void;
  onFail: (song: Song) => void;
  failedAlbumArtSongs: Song[];
}

export const ParsedSongsList: React.FC<ParsedSongsListProps> = ({
  songs,
  onClear,
  onFail,
  failedAlbumArtSongs, // keep prop for now for compatibility, but don't render
}) => {
  if (songs.length === 0) return null;
  return (
    <Card className="w-full max-w-md h-full min-h-[440px] p-4 rounded-lg shadow-md bg-secondary flex flex-col">
      <CardHeader className="flex flex-row items-start justify-center">
        <CardTitle className="text-lg font-semibold text-center w-full">Parsed Songs ({songs.length})</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        <SongList songs={songs} onFail={onFail} />
      </CardContent>
    </Card>
  );
};
