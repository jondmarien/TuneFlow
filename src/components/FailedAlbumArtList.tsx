import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Song } from "@/types/tuneflow";

interface FailedAlbumArtListProps {
  failedAlbumArtSongs: Song[];
}

export const FailedAlbumArtList: React.FC<FailedAlbumArtListProps> = ({ failedAlbumArtSongs }) => {
  if (failedAlbumArtSongs.length === 0) return null;
  return (
    <Card className="w-full max-w-md h-full min-h-[200px] p-4 rounded-lg shadow-md flex flex-col bg-yellow-100 border-yellow-400 dark:bg-yellow-950 dark:border-yellow-900">
      <CardHeader className="flex items-center justify-center px-6 pt-6">
        <CardTitle className="text-lg font-semibold text-center w-full text-yellow-700 dark:text-yellow-200">Songs Failed to Find Album Art ({failedAlbumArtSongs.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-0 flex-1 flex flex-col justify-center">
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {failedAlbumArtSongs.map((song) => (
            <li key={`fail-art-${song.title}|${song.artist}`} className="flex items-center text-sm border-b pb-1 bg-yellow-200/80 border-yellow-300 rounded dark:bg-yellow-900/70 dark:border-yellow-800 min-h-[40px]">
              <div className="w-10 h-10 flex items-center justify-center bg-yellow-300 rounded mr-3 border text-xs text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200">
                <span className="block w-full text-center">N/A</span>
              </div>
              <div className="flex flex-col justify-center">
                <div className="font-semibold text-yellow-900 dark:text-yellow-100">{song.title}</div>
                <div className="text-xs text-yellow-700 dark:text-yellow-300">{song.artist}</div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
