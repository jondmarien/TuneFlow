import React from "react";
import { Button } from "@/components/ui/button";

/**
 * SpotifyStatusBanner Component
 * Displays Spotify connection/search status and connect button.
 * Props:
 *   - spotifyConnected: boolean|null
 *   - loading: boolean
 *   - onConnect: () => void
 */
export function SpotifyStatusBanner({
  spotifyConnected,
  loading,
  onConnect,
}: {
  spotifyConnected: boolean | null;
  loading: boolean;
  onConnect: () => void;
}) {
  return (
    <div className="flex items-center space-x-2">
      <span className="font-semibold" style={{ color: '#1DB954' }}>Spotify</span>
      {spotifyConnected ? (
    <span className="ml-1 text-xs px-2 py-0.5 rounded bg-[#d1fae5]" style={{ backgroundColor: '#d1fae5', color: '#059669', fontWeight: 600, border: '1px solid #6ee7b7', minWidth: 90, display: 'inline-block', textAlign: 'center' }}>
      CONNECTED!
    </span>
  ) : (
    <Button
      variant="outline"
      size="sm"
      className="ml-2 border-[#1DB954] text-[#1DB954] hover:bg-[#1DB954]/10 focus:ring-[#1DB954]"
      onClick={onConnect}
      disabled={loading}
    >
      Connect
    </Button>
      )}
    </div>  );
}
