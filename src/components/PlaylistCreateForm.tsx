"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaylistNameForm } from "@/components/PlaylistNameForm";

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
}: PlaylistCreateFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);

  // Helper to extract YouTube video ID
  function getYoutubeVideoId(url: string): string | null {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes("youtu.be")) {
        return parsed.pathname.slice(1);
      }
      return parsed.searchParams.get("v");
    } catch {
      return null;
    }
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
        description: `No songs available to create a ${service} playlist.`,
        variant: "destructive",
        position: "top-left",
      });
      onError?.("No songs");
      return;
    }
    setLoading(true);
    try {
      let finalPlaylistName = playlistName;
      if (useAiPlaylistName) {
        finalPlaylistName = await generateAiPlaylistName(songs);
        setPlaylistName(finalPlaylistName);
      }
      if (service === "spotify") {
        // Fetch Spotify user ID
        const userRes = await fetch("/api/spotify/me");
        const userData = await userRes.json();
        if (!userData.id) {
          toast({
            title: "Spotify User Error",
            description: "Could not fetch Spotify user ID.",
            variant: "destructive",
            position: "top-left",
          });
          setLoading(false);
          onError?.("No Spotify user ID");
          return;
        }
        // Find Spotify track URIs for all parsed songs (basic, expects videoId as track URI)
        // In actual usage, you may want to map songs to Spotify URIs via a search API
        // For now, assume songs have a 'spotifyUri' property (not present in Song type)
        // This should be improved with a robust track search if needed
        const trackUris = songs.map((song: any) => song.spotifyUri).filter(Boolean);
        const createResponse = await fetch("/api/spotify/playlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: userData.id,
            playlistName: finalPlaylistName,
            trackUris,
          }),
        });
        const createData = await createResponse.json();
        if (!createResponse.ok) {
          toast({
            title: "Playlist Creation Failed",
            description: createData.error || createData.message || `Failed to create playlist (Status: ${createResponse.status})`,
            variant: "destructive",
            position: "top-left",
          });
          onError?.(createData.error || "Spotify playlist creation failed");
          setLoading(false);
          return;
        }
        setPlaylistUrl(createData.playlistUrl || null);
        toast({
          title: "Playlist Created!",
          description: (
            <span>
              Playlist '{finalPlaylistName}' created successfully!{' '}
              {createData.playlistUrl && (
                <a href={createData.playlistUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#22c55e', fontWeight: 'bold', textDecoration: 'underline' }}>
                  Open Playlist
                </a>
              )}
            </span>
          ),
          variant: "default",
          duration: 10000,
          position: "top-right",
        });
        onSuccess?.(createData.playlistUrl);
      } else if (service === "youtube") {
        // --- Get videoIds from songs ---
        const videoIds = songs.map(song => song.videoId).filter((id): id is string => Boolean(id));
        // --- Create playlist with correct title and videoIds ---
        const res = await fetch("/api/youtube/playlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playlistName: finalPlaylistName,
            description: `Created with TuneFlow from YouTube comments`,
            videoIds: videoIds.length > 0 ? videoIds : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast({
            title: "YouTube Playlist Error",
            description: data.error || "Could not create YouTube playlist.",
            variant: "destructive",
            position: "top-left",
          });
          onError?.(data.error || "YouTube playlist creation failed");
          setLoading(false);
          return;
        }
        setPlaylistUrl(data.playlistUrl || null);
        toast({
          title: "Playlist Created!",
          description: (
            <span>
              Playlist created successfully!{' '}
              {data.playlistUrl && (
                <a href={data.playlistUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#ef4444', fontWeight: 'bold', textDecoration: 'underline' }}>
                  Open Playlist
                </a>
              )}
            </span>
          ),
          variant: "default",
          duration: 10000,
          position: "top-right",
        });
        onSuccess?.(data.playlistUrl);
      }
    } catch (err: any) {
      toast({
        title: "Playlist Creation Error",
        description: err.message || `Could not create ${service} playlist.`,
        variant: "destructive",
        position: "top-left",
      });
      onError?.(err.message || "Playlist creation error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md p-4 rounded-lg shadow-md bg-secondary mt-4">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex justify-center items-center text-center w-full">
          {service === "spotify" ? (
            <span className="flex items-center"><span role="img" aria-label="Spotify">🟢</span> Spotify Playlist</span>
          ) : (
            <span className="flex items-center"><span role="img" aria-label="YouTube">🔴</span> YouTube Playlist</span>
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
        <Button
          className="mt-4 w-full"
          onClick={handleCreatePlaylist}
          disabled={loading || !connected || songs.length === 0}
        >
          {loading ? "Creating..." : `Create ${service === "spotify" ? "Spotify" : "YouTube"} Playlist`}
        </Button>
        {playlistUrl && (
          <div className="mt-4 text-center">
            <a href={playlistUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-bold">
              Open Playlist
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
