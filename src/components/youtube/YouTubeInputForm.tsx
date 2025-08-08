import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/**
 * YouTubeInputForm Component
 * Handles YouTube URL/ID input, extraction options, and parse trigger.
 * Props:
 *   - youtubeLink, setYoutubeLink
 *   - inputMode, setInputMode
 *   - scanComments, setScanComments
 *   - scanDescription, setScanDescription
 *   - scanChapters, setScanChapters
 *   - prioritizePinned, setPrioritizePinned
 *   - loading
 *   - onParse (callback)
 */
export function YouTubeInputForm({
  youtubeLink,
  setYoutubeLink,
  inputMode,
  setInputMode,
  scanComments,
  setScanComments,
  scanDescription,
  setScanDescription,
  scanChapters,
  setScanChapters,
  prioritizePinned,
  setPrioritizePinned,
  loading,
  onParse,
}: {
  youtubeLink: string;
  setYoutubeLink: (v: string) => void;
  inputMode: 'url' | 'id';
  setInputMode: (v: 'url' | 'id') => void;
  scanComments: boolean;
  setScanComments: (v: boolean) => void;
  scanDescription: boolean;
  setScanDescription: (v: boolean) => void;
  scanChapters: boolean;
  setScanChapters: (v: boolean) => void;
  prioritizePinned: boolean;
  setPrioritizePinned: (v: boolean) => void;
  loading: boolean;
  onParse: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2 justify-center">
        <Label htmlFor="inputModeUrl">
          <input
            id="inputModeUrl"
            type="radio"
            checked={inputMode === 'url'}
            onChange={() => setInputMode('url')}
            className="mr-1"
          />
          YouTube URL
        </Label>
        <Label htmlFor="inputModeId">
          <input
            id="inputModeId"
            type="radio"
            checked={inputMode === 'id'}
            onChange={() => setInputMode('id')}
            className="mr-1"
          />
          Video ID Only
        </Label>
      </div>
      <Input
        id="youtube-link"
        type="text"
        placeholder={inputMode === 'url' ? 'Paste YouTube URL here' : 'Enter YouTube Video ID'}
        value={youtubeLink}
        onChange={(e) => setYoutubeLink(e.target.value)}
        className="rounded-md"
        disabled={loading}
      />
      <div className="flex items-center space-x-2">
        <Checkbox
          id="scan-comments"
          checked={scanComments}
          onCheckedChange={(checked) => setScanComments(Boolean(checked))}
          disabled={loading}
        />
        <Label htmlFor="scan-comments" className="text-sm text-muted-foreground">
          Scan YouTube Comments for Songs
        </Label>
      </div>
      <div className="flex items-center space-x-2 pl-7">
        <Checkbox
          id="prioritize-pinned"
          checked={prioritizePinned}
          onCheckedChange={(checked) => setPrioritizePinned(Boolean(checked))}
          disabled={!scanComments || loading}
        />
        <Label htmlFor="prioritize-pinned" className="text-xs text-muted-foreground">
          Prioritize Pinned Comments (if available)
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="scan-description"
          checked={scanDescription}
          onCheckedChange={(checked) => setScanDescription(Boolean(checked))}
          disabled={loading}
        />
        <Label htmlFor="scan-description" className="text-sm text-muted-foreground">
          Scan Description for Songs
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="scan-chapters"
          checked={scanChapters}
          onCheckedChange={(checked) => setScanChapters(Boolean(checked))}
          disabled={loading}
        />
        <Label htmlFor="scan-chapters" className="text-sm text-muted-foreground">
          Scan Chapters for Songs
        </Label>
      </div>
      <Button
        onClick={onParse}
        disabled={loading || !youtubeLink}
        className="w-full rounded-md font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-px transition-all duration-150"
      >
        {loading ? 'Parsing...' : 'Parse YouTube Video Information'}
      </Button>
    </div>
  );
}
