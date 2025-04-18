import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * PlaylistNameForm Component
 * Handles playlist name input and (optionally) AI name generation.
 * Props:
 *   - playlistName, setPlaylistName
 *   - useAiPlaylistName, setUseAiPlaylistName
 *   - disabled
 */
export function PlaylistNameForm({
  playlistName,
  setPlaylistName,
  useAiPlaylistName,
  setUseAiPlaylistName,
  disabled,
}: {
  playlistName: string;
  setPlaylistName: (v: string) => void;
  useAiPlaylistName: boolean;
  setUseAiPlaylistName: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="playlist-name" className="text-sm text-muted-foreground">
        Playlist Name
      </Label>
      <Input
        id="playlist-name"
        type="text"
        placeholder="Enter playlist name"
        value={playlistName}
        onChange={(e) => setPlaylistName(e.target.value)}
        className="rounded-md"
        disabled={disabled}
      />
      <div className="flex items-center space-x-2">
        <input
          id="ai-playlist-name"
          type="checkbox"
          checked={useAiPlaylistName}
          onChange={(e) => setUseAiPlaylistName(e.target.checked)}
          disabled={disabled}
        />
        <Label htmlFor="ai-playlist-name" className="text-sm text-muted-foreground">
          Use AI to generate playlist name
        </Label>
      </div>
    </div>
  );
}
