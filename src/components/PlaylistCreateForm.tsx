"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaylistNameForm } from "@/components/PlaylistNameForm";
import { YoutubeIcon, SpotifyIcon } from "@/components/CustomIcons";
import { FailedSpotifySongsList } from "@/components/FailedSpotifySongsList";

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
}: PlaylistCreateFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);
  const [spotifySearchStatus, setSpotifySearchStatus] = useState<'idle' | 'searching' | 'done'>('idle');
  const [spotifySongSearches, setSpotifySongSearches] = useState<{ song: Song; status: 'pending' | 'searching' | 'found' | 'not_found' }[]>([]);
  const [currentSpotifySearchSong, setCurrentSpotifySearchSong] = useState<Song | null>(null);
  const [spotifyPlaylistUrl, setSpotifyPlaylistUrl] = useState<string | null>(null);
  const [spotifyAllSongsFound, setSpotifyAllSongsFound] = useState<boolean | null>(null);
  const [abortPlaylist, setAbortPlaylist] = useState(false);
  const [playlistAbortController, setPlaylistAbortController] = useState<AbortController | null>(null);
  const [failedSpotifySongs, setFailedSpotifySongs] = useState<Song[]>([]);
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');

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

  // --- Robust Spotify Track Search (copied from page.tsx.old) ---
  async function robustSpotifyTrackSearch(song: Song, signal?: AbortSignal): Promise<string | null> {
    // Try several search patterns
    const baseQuery = `${song.title} ${song.artist}`;
    const altQueries = [
      baseQuery,
      song.title,
      `${song.title.replace(/\s*\([^)]*\)/g, '')} ${song.artist}`.trim(),
      `${song.title} (explicit) ${song.artist}`,
      `${song.title} (with ${song.artist})`,
      song.artist,
    ];
    for (const q of altQueries) {
      try {
        const res = await fetch('/api/spotify/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q }),
          signal,
        });
        if (!res.ok) continue;
        const data = await res.json();
        if (data.track && data.track.uri) {
          const cleanTitle = song.title.replace(/\s*\([^)]*\)/g, '').toLowerCase();
          if (data.track.name.toLowerCase().includes(cleanTitle) || data.track.name.toLowerCase().includes(song.title.toLowerCase())) {
            return data.track.uri;
          }
          if (data.track.artists && data.track.artists.some((a: any) => a.name.toLowerCase().includes(song.artist.toLowerCase()))) {
            return data.track.uri;
          }
          return data.track.uri;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return null;
      }
    }
    return null;
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
    if (service === "spotify") {
      setSpotifySearchStatus('searching');
      setSpotifySongSearches(songs.map(song => ({ song, status: 'pending' })));
      setCurrentSpotifySearchSong(null);
      setSpotifyPlaylistUrl(null);
      setSpotifyAllSongsFound(null);
      const abortController = new AbortController();
      setPlaylistAbortController(abortController);
      let finalPlaylistName = playlistName;
      try {
        // --- Ensure playlistName is pulled from YouTube video title if not using AI ---
        if (!useAiPlaylistName) {
          // --- Match original logic: always use getYoutubeVideoId(youtubeLink) ---
          console.log('[DEBUG] youtubeLink:', youtubeLink);
          const videoId = getYoutubeVideoId(youtubeLink);
          console.log('[DEBUG] Extracted videoId:', videoId);
          if (videoId) {
            const ytTitle = await fetchYoutubeTitle(videoId);
            console.log('[DEBUG] YouTube title:', ytTitle);
            if (ytTitle) {
              finalPlaylistName = ytTitle;
            } else {
              toast({ title: 'YouTube Title Error', description: 'Could not fetch YouTube video title. Using fallback name.', variant: 'destructive', position: 'top-left' });
              finalPlaylistName = 'TuneFlow Playlist';
            }
          } else {
            toast({ title: 'YouTube Link Error', description: `Could not extract video ID from YouTube link: ${youtubeLink}. Using fallback name.`, variant: 'destructive', position: 'top-left' });
            finalPlaylistName = 'TuneFlow Playlist';
          }
        } else {
          finalPlaylistName = await generateAiPlaylistName(songs);
        }
        setPlaylistName(finalPlaylistName);
        // Find Spotify track URIs for all parsed songs (robust search)
        let trackUris: string[] = [];
        let failedSongs: Song[] = [];
        for (let i = 0; i < songs.length; i++) {
          if (abortPlaylist) throw new Error('Playlist creation stopped by user.');
          setCurrentSpotifySearchSong(songs[i]);
          setSpotifySongSearches(prev => prev.map((entry, idx) => idx === i ? { ...entry, status: 'searching' } : entry));
          const uri = await robustSpotifyTrackSearch(songs[i], abortController.signal);
          if (uri) {
            trackUris.push(uri);
            setSpotifySongSearches(prev => prev.map((entry, idx) => idx === i ? { ...entry, status: 'found' } : entry));
          } else {
            failedSongs.push(songs[i]);
            setSpotifySongSearches(prev => prev.map((entry, idx) => idx === i ? { ...entry, status: 'not_found' } : entry));
          }
        }
        setCurrentSpotifySearchSong(null);
        setSpotifySearchStatus('done');
        setSpotifyAllSongsFound(failedSongs.length === 0);
        setFailedSpotifySongs(failedSongs);
        if (abortPlaylist) throw new Error('Playlist creation stopped by user.');
        // Fetch Spotify user ID
        const userRes = await fetch('/api/spotify/me', { signal: abortController.signal });
        const userData = await userRes.json();
        if (!userData.id) {
          toast({
            title: "Spotify User Error",
            description: "Could not fetch Spotify user ID.",
            variant: "destructive",
            position: "top-left",
          });
          setLoading(false);
          setSpotifySearchStatus('idle');
          return;
        }
        // --- Playlist Creation Request ---
        const createResponse = await fetch('/api/spotify/playlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userData.id,
            playlistName: finalPlaylistName,
            trackUris,
            public: privacy === 'public',
          }),
          signal: abortController.signal,
        });
        let createData;
        let createIsJson = false;
        const createContentType = createResponse.headers.get('content-type');
        if (createContentType && createContentType.includes('application/json')) {
          try {
            createData = await createResponse.json();
            createIsJson = true;
          } catch (err) {
            createData = { error: 'Failed to parse JSON response from /api/spotify/playlist.' };
          }
        } else {
          createData = { error: 'Received non-JSON response from /api/spotify/playlist.' };
        }
        if (!createResponse.ok) {
          const errorMessage = createData?.error || createData?.message || `Failed to create playlist (Status: ${createResponse.status})`;
          toast({
            title: "Playlist Creation Failed",
            description: errorMessage,
            variant: "destructive",
            position: 'top-left',
          });
          setLoading(false);
          setSpotifySearchStatus('idle');
          setFailedSpotifySongs(failedSongs);
          return;
        } else {
          setSpotifyPlaylistUrl(createData.playlistUrl || null);
          setSpotifyAllSongsFound(failedSongs.length === 0);
          // Remove any false positives: only show as failed if NOT in the playlist (if playlistUrl present)
          if (createData.addedTracks) {
            // createData.addedTracks should be an array of objects or strings with title/artist info
            setFailedSpotifySongs(failedSongs.filter(song => {
              // Check if song is not in the addedTracks list
              return !createData.addedTracks.some((added: any) => {
                // Fuzzy match by title and artist
                return (
                  (added.title && added.title.toLowerCase() === song.title.toLowerCase()) &&
                  (added.artist && added.artist.toLowerCase() === song.artist.toLowerCase())
                );
              });
            }));
          }
          toast({
            title: 'Playlist Created!',
            description: (
              <span>
                Playlist '{finalPlaylistName}' created successfully!
              </span>
            ),
            variant: 'default',
            duration: 10000,
            position: 'top-right',
          });
          onSuccess?.(createData.playlistUrl);
        }
      } catch (err: any) {
        setSpotifySearchStatus('idle');
        setCurrentSpotifySearchSong(null);
        setSpotifyPlaylistUrl(null);
        setSpotifyAllSongsFound(null);
        if (err.name === 'AbortError' || err.message === 'Playlist creation stopped by user.') {
          toast({
            title: 'Playlist Creation Stopped',
            description: 'Playlist creation was aborted by the user.',
            variant: 'destructive',
            position: 'top-left',
          });
        } else {
          toast({
            title: "Playlist Creation Error",
            description: err.message || `Could not create Spotify playlist.`,
            variant: "destructive",
            position: "top-left",
          });
        }
        onError?.(err.message || "Playlist creation error");
      } finally {
        setLoading(false);
        setSpotifySearchStatus('idle');
        setAbortPlaylist(false);
        setPlaylistAbortController(null);
        setCurrentSpotifySearchSong(null);
      }
    } else if (service === "youtube") {
      if (!youtubeLink) {
        toast({ title: "YouTube Link Missing", description: "Please enter a YouTube URL or video ID before creating a playlist.", variant: "destructive", position: "top-left" });
        setLoading(false);
        return;
      }
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
              <a href={data.playlistUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-bold">
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
  };

  // Stop/Abort Playlist Creation (from page.tsx.old)
  const handleStopPlaylist = () => {
    if (playlistAbortController) {
      playlistAbortController.abort();
    }
    setAbortPlaylist(true);
  };

  // Optionally, abort effect for UI feedback (from page.tsx.old)
  useEffect(() => {
    if (abortPlaylist) {
      setLoading(false);
      toast({
        title: 'Playlist Creation Stopped',
        description: 'Playlist creation was aborted by the user.',
        variant: 'destructive',
        position: 'top-left',
      });
    }
  }, [abortPlaylist]);

  return (
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
              />
              Private
            </label>
          </div>
        </div>
        <Button
          className="mt-4 w-full"
          onClick={handleCreatePlaylist}
          disabled={loading || !connected || songs.length === 0}
        >
          {loading && service === 'spotify' && spotifySearchStatus === 'searching' && currentSpotifySearchSong ? (
            "Searching..."
          ) : loading ? (
            "Creating..."
          ) : (
            `Create ${service === "spotify" ? "Spotify" : "YouTube"} Playlist`
          )}
        </Button>
        {/* Show 'Searching for x song' below the button when searching for a Spotify song */}
        {loading && service === 'spotify' && spotifySearchStatus === 'searching' && currentSpotifySearchSong && (
          <div className="flex flex-col items-center justify-center mt-2 w-full">
            <div className="flex items-center">
              <svg className="animate-spin h-5 w-5 text-orange-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              <span className="text-orange-600 font-medium text-center">
                Searching for <b>{currentSpotifySearchSong.title}</b> by <b>{currentSpotifySearchSong.artist}</b>.
              </span>
            </div>
          </div>
        )}
        {/* STOP/ABORT PLAYLIST BUTTON: Only show if loading/creating and playlist is not yet created */}
        {loading && !playlistUrl && (
          <Button
            className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white"
            onClick={handleStopPlaylist}
            type="button"
          >
            Stop / Abort Playlist Creation
          </Button>
        )}
        {/* Failed Spotify Songs List: only show after playlist creation/search */}
        {service === 'spotify' && !loading && spotifySearchStatus === 'done' && failedSpotifySongs.length > 0 && (
          <FailedSpotifySongsList failedSpotifySongs={failedSpotifySongs} />
        )}
      </CardContent>
    </Card>
  );
}
