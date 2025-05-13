import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Song } from "@/types/tuneflow";

interface FailedSpotifySongsListProps {
  failedSpotifySongs: Song[];
}

export const FailedSpotifySongsList: React.FC<FailedSpotifySongsListProps> = ({ failedSpotifySongs }) => {
  if (failedSpotifySongs.length === 0) return null;
  return (
    <Card className="w-full max-w-md h-full min-h-[200px] p-4 rounded-lg shadow-md flex flex-col bg-red-100 border-red-400 dark:bg-red-950 dark:border-red-900">
      <CardHeader className="flex items-center justify-center px-6 pt-6">
        <CardTitle className="text-lg font-semibold text-center w-full text-red-700 dark:text-red-200">Songs Failed to be Found on Spotify ({failedSpotifySongs.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-0 flex-1 flex flex-col justify-center">
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {failedSpotifySongs.map((song) => (
            <li key={`fail-spotify-${song.title}|${song.artist}`} className="flex items-center text-sm border-b pb-1 bg-red-200/80 border-red-300 rounded dark:bg-red-900/70 dark:border-red-800 min-h-[40px]">
              <div className="w-10 h-10 flex items-center justify-center bg-red-300 rounded mr-3 border text-xs text-red-800 dark:bg-red-800 dark:text-red-200">
                <span className="block w-full text-center">N/A</span>
              </div>
              <div className="flex flex-col justify-center">
                <div className="font-semibold text-red-900 dark:text-red-100">{song.title}</div>
                <div className="text-xs text-red-700 dark:text-red-300">{song.artist}</div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
