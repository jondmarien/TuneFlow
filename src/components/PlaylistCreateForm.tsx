"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaylistNameForm } from "@/components/PlaylistNameForm";
import { YoutubeIcon, SpotifyIcon } from "@/components/CustomIcons";
import { FailedSpotifySongsList } from "@/components/FailedSpotifySongsList";
import { getSpotifySdk, robustSpotifyTrackSearch, createSpotifyPlaylist } from '@/services/spotify';

// Song type definition
export type Song = {
  title: string;
  artist: string;
  imageUrl?: string;
  videoId?: string;
};

interface PlaylistCreateFormProps {
  songs: Song[];
  service: "spotify" | "youtube";
  playlistName: string;
  setPlaylistName: (name: string) => void;
  useAiPlaylistName: boolean;
  setUseAiPlaylistName: (v: boolean) => void;
  connected: boolean;
  onSuccess?: (playlistUrl: string) => void;
  onError?: (error: string) => void;
  youtubeLink?: string;
  failedAlbumArtSongs: Song[];
  spotifyAccessToken: string;
  spotifyRefreshToken?: string;
  spotifyExpiresAt?: number;
}

export function PlaylistCreateForm({
  songs,
  service,
  playlistName,
  setPlaylistName,
  useAiPlaylistName,
  setUseAiPlaylistName,
  connected,
  onSuccess,
  onError,
  youtubeLink = "",
  failedAlbumArtSongs,
  spotifyAccessToken,
  spotifyRefreshToken,
  spotifyExpiresAt,
}: PlaylistCreateFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [debugError, setDebugError] = useState<any>(null);

  // Helper to extract YouTube video ID (robust)
  function getYoutubeVideoId(url: string): string | null {
    // Accept both full URLs and IDs
    if (!url) return null;
    // If it's already an 11-char ID (YouTube video IDs are always 11 chars)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
    try {
      // Try to parse as URL
      const parsed = new URL(url);
      if (parsed.hostname.includes("youtu.be")) {
        return parsed.pathname.slice(1);
      }
      if (parsed.hostname.includes("youtube.com")) {
        const v = parsed.searchParams.get("v");
        if (v) return v;
        // Also support /embed/VIDEOID and /shorts/VIDEOID
        const match = parsed.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
        if (match) return match[1];
        const shorts = parsed.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
        if (shorts) return shorts[1];
      }
    } catch {
      // Not a URL, try to extract ID from string
      const idMatch = url.match(/([a-zA-Z0-9_-]{11})/);
      if (idMatch) return idMatch[1];
    }
    return null;
  }

  // Fetch YouTube video title for playlist name
  async function fetchYoutubeTitle(videoId: string): Promise<string | null> {
    try {
      const res = await fetch("/api/youtube/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId })
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.title || null;
    } catch {
      return null;
    }
  }

  // Fallback AI playlist name generation using YouTube title or a static name
  async function generateAiPlaylistName(songs: Song[]): Promise<string> {
    if (!songs.length) return "TuneFlow Playlist";
    try {
      const videoId = youtubeLink ? getYoutubeVideoId(youtubeLink) : null;
      if (videoId) {
        const ytTitle = await fetchYoutubeTitle(videoId);
        if (ytTitle) return ytTitle + " Playlist";
      }
    } catch (err) {
      // fallback
    }
    return "TuneFlow Playlist";
  }

  const handleCreatePlaylist = async () => {
    if (!connected) {
      toast({
        title: `${service === "spotify" ? "Spotify" : "YouTube"} Login Required`,
        description: `Please connect your ${service === "spotify" ? "Spotify" : "YouTube (Google)"} account before creating a playlist.`,
        variant: "destructive",
        position: "top-left",
      });
      onError?.("Not connected");
      return;
    }
    if (songs.length === 0) {
      toast({
        title: "No Songs",
        description: "No songs to add to playlist.",
        variant: "destructive",
        position: "top-left",
      });
      onError?.("No songs");
      return;
    }
    setLoading(true);
    try {
      let playlistUrl = '';
      if (service === "spotify") {
        const spotifySdk = getSpotifySdk(spotifyAccessToken, spotifyRefreshToken, spotifyExpiresAt);
        playlistUrl = await createSpotifyPlaylist(songs, playlistName, spotifyAccessToken, spotifyRefreshToken, spotifyExpiresAt, privacy === 'public');
      } else {
        // --- Get videoIds from songs ---
        const videoIds = songs.map(song => song.videoId).filter((id): id is string => Boolean(id));
        // --- Create playlist with correct title and videoIds ---
        const res = await fetch("/api/youtube/playlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playlistName: playlistName,
            description: `Created with TuneFlow from YouTube comments`,
            videoIds: videoIds.length > 0 ? videoIds : undefined,
            privacyStatus: privacy,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Could not create YouTube playlist.");
        }
        playlistUrl = data.playlistUrl || '';
      }
      setPlaylistUrl(playlistUrl);
      onSuccess?.(playlistUrl);
      toast({
        title: `${service === "spotify" ? "Spotify" : "YouTube"} Playlist Created`,
        description: `Your ${service === "spotify" ? "Spotify" : "YouTube"} playlist was created successfully!`,
        variant: "default",
        position: "top-left",
      });
    } catch (err: any) {
      setDebugError(err);
      toast({
        title: `${service === "spotify" ? "Spotify" : "YouTube"} Playlist Error`,
        description: err?.message || `An error occurred creating the ${service === "spotify" ? "Spotify" : "YouTube"} playlist.`,
        variant: "destructive",
        position: "top-left",
      });
      onError?.(err?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  function DebugOverlay({ error }: { error: any }) {
    if (!error) return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        background: 'rgba(255,0,0,0.95)',
        color: 'white',
        zIndex: 99999,
        padding: 16,
        fontSize: 16,
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        maxHeight: '40vh',
        overflowY: 'auto',
      }}>
        <b>Debug Error Overlay:</b>
        <div>{typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}</div>
      </div>
    );
  }

  return (
    <div>
      <DebugOverlay error={debugError} />
      <Card className="w-full max-w-md p-4 rounded-lg shadow-md bg-secondary mt-4">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex justify-center items-center text-center w-full">
            {service === "spotify" ? (
              <span className="flex items-center"><SpotifyIcon /> Spotify Playlist</span>
            ) : (
              <span className="flex items-center"><YoutubeIcon /> YouTube Playlist</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PlaylistNameForm
            playlistName={playlistName}
            setPlaylistName={setPlaylistName}
            useAiPlaylistName={useAiPlaylistName}
            setUseAiPlaylistName={setUseAiPlaylistName}
            disabled={loading}
          />
          {/* Playlist privacy radio group */}
          <div className="flex flex-col gap-2 my-4 items-center">
            <label className="font-medium">Playlist Privacy:</label>
            <div className="flex gap-4 justify-center">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="playlist-privacy"
                  value="public"
                  checked={privacy === 'public'}
                  onChange={() => setPrivacy('public')}
                  disabled={loading}
                  aria-label="Set playlist public"
                />
                Public
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="playlist-privacy"
                  value="private"
                  checked={privacy === 'private'}
                  onChange={() => setPrivacy('private')}
                  disabled={loading}
                  aria-label="Set playlist private"
                />
                Private
              </label>
            </div>
            {/* Privacy info */}
            <span className="text-xs text-muted-foreground mt-1">
              {privacy === 'public'
                ? 'Anyone with the link can view this playlist.'
                : 'Only you can view this playlist.'}
            </span>
          </div>
          <Button
            className="mt-4 w-full"
            onClick={handleCreatePlaylist}
            disabled={loading || !connected || songs.length === 0}
          >
            {loading ? (
              "Creating..."
            ) : (
              `Create ${service === "spotify" ? "Spotify" : "YouTube"} Playlist`
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
