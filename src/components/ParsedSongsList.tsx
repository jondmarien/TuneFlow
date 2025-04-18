import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SongList } from "@/components/SongList";
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
  failedAlbumArtSongs,
}) => {
  if (songs.length === 0) return null;
  return (
    <Card className="w-full max-w-md h-full min-h-[440px] p-4 rounded-lg shadow-md bg-secondary flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between">
        <CardTitle className="text-lg font-semibold">Parsed Songs ({songs.length})</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          disabled={songs.length === 0}
        >
          Clear
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        <SongList songs={songs} onFail={onFail} />
      </CardContent>
      {failedAlbumArtSongs.length > 0 && (
        <div className="mt-6">
          <div
            className="rounded-lg border bg-card text-card-foreground shadow-sm mb-6"
            style={{ background: 'var(--card-bg,rgba(238, 157, 146, 0.66))' }}
          >
            <div className="flex items-center justify-between px-6 pt-6">
              <h3 className="text-lg font-semibold">Songs Failed to Parse (Album Art or Search)</h3>
            </div>
            <div className="p-6 pt-0">
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {failedAlbumArtSongs.map((song) => (
                  <li key={`fail-${hashSong(song)}`} className="flex items-center text-sm border-b pb-1">
                    <div className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded mr-3 border text-xs text-gray-500">N/A</div>
                    <div>
                      <div className="font-semibold">{song.title}</div>
                      <div className="text-xs text-gray-500">{song.artist}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
