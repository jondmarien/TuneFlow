"use client";
/**
 * TuneFlow Main Page
 *
 * This page provides the main UI for parsing YouTube comments, chapters, and descriptions
 * to extract songs and display them with album art. Users can also create Spotify playlists
 * from the parsed songs. The UI includes advanced logic for polling album art, handling
 * failed fetches, and providing clear feedback to the user.
 */

// --- Imports ---
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import { parseYouTubeComment, ParseYouTubeCommentOutput } from "@/ai/flows/parse-youtube";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { signIn, signOut, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { hasAccessToken } from "@/utils/typeGuards";
import { useAlbumArtWithFailure } from "@/hooks/useAlbumArtWithFailure";
import { SongItem } from "@/components/SongItem";
import { SongList } from "@/components/SongList";
import { YouTubeInputForm } from "@/components/YouTubeInputForm";
import { PlaylistNameForm } from "@/components/PlaylistNameForm";
import { SpotifyStatusBanner } from "@/components/SpotifyStatusBanner";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PaginationControls } from "@/components/PaginationControls";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { fetchFallbackAlbumArt, AlbumArtDialog as AlbumArtDialogComponent } from "@/components/AlbumArtDialog";
import { PlaylistCreateForm } from "@/components/PlaylistCreateForm";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { YoutubeStatusBanner } from "@/components/YoutubeStatusBanner";
import { ParsedSongsList } from "@/components/ParsedSongsList";
import { FailedSongsList } from "@/components/FailedSongsList";
import { FailedAlbumArtList } from "@/components/FailedAlbumArtList";

// Define Song type locally or in a shared types file if needed elsewhere
type Song = {
  title: string;
  artist: string;
  imageUrl?: string; // Optional album art URL
  videoId?: string;  // Optional YouTube video ID
};

// YouTube SVG icon (red and white official logo)
const youtubeIcon = <Icons.youtube />;
const spotifyIcon = <Icons.spotify />;
const appleMusicIcon = <Icons.appleMusic />;

// --- Main Component ---

/**
 * Home Component (Main App)
 *
 * Handles state, UI, and logic for parsing YouTube data and displaying songs.
 * Includes advanced error handling, album art polling, and playlist creation.
 */
export default function Home() {
  // --- Auth Hooks ---
  const { data: session, status } = useSession();
  const youtubeConnected = hasAccessToken(session);

  // --- Hydration-safe state for client-only data ---
  const [mounted, setMounted] = useState(false);
  const [youtubeLink, setYoutubeLink] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('youtubeLink') || '';
    }
    return '';
  });
  const [songs, setSongs] = useState<Song[]>(() => {
    if (typeof window !== 'undefined') {
      const s = sessionStorage.getItem('parsedSongs');
      return s ? JSON.parse(s) : [];
    }
    return [];
  });
  const [failedAlbumArtSongs, setFailedAlbumArtSongs] = useState<Song[]>(() => {
    if (typeof window !== 'undefined') {
      const f = sessionStorage.getItem('failedSongs');
      return f ? JSON.parse(f) : [];
    }
    return [];
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Persist youtubeLink, songs, and failedAlbumArtSongs to sessionStorage
  useEffect(() => {
    if (!mounted) return;
    sessionStorage.setItem('youtubeLink', youtubeLink);
  }, [youtubeLink, mounted]);
  useEffect(() => {
    if (!mounted) return;
    sessionStorage.setItem('parsedSongs', JSON.stringify(songs));
  }, [songs, mounted]);
  useEffect(() => {
    if (!mounted) return;
    sessionStorage.setItem('failedSongs', JSON.stringify(failedAlbumArtSongs));
  }, [failedAlbumArtSongs, mounted]);

  // --- State Hooks ---
  const [loading, setLoading] = useState(false);
  const [useAiPlaylistName, setUseAiPlaylistName] = useState(false);
  const [playlistName, setPlaylistName] = useState<string>("");
  const [prioritizePinned, setPrioritizePinned] = useState(false);
  const [scanDescription, setScanDescription] = useState(false);
  const [scanChapters, setScanChapters] = useState(false);
  const [scanComments, setScanComments] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState<boolean | null>(null);
  const { toast } = useToast();
  const [spotifyReady, setSpotifyReady] = useState(true); // Assume ready for basic search initially
  const [parsingState, setParsingState] = useState<string | null>(null); // More specific state tracking
  const [canCreatePlaylist, setCanCreatePlaylist] = useState(false);
  const [spotifySearchStatus, setSpotifySearchStatus] = useState<'idle' | 'searching' | 'done'>('idle');
  const [spotifySongSearches, setSpotifySongSearches] = useState<{ song: Song; status: 'pending' | 'searching' | 'found' | 'not_found' }[]>([]);
  const [currentSpotifySearchSong, setCurrentSpotifySearchSong] = useState<Song | null>(null);
  const [spotifyPlaylistUrl, setSpotifyPlaylistUrl] = useState<string | null>(null);
  const [spotifyAllSongsFound, setSpotifyAllSongsFound] = useState<boolean | null>(null);
  const [commentsPage, setCommentsPage] = useState(1);
  const [showMoreCommentsPrompt, setShowMoreCommentsPrompt] = useState(false);
  const [canFetchMoreComments, setCanFetchMoreComments] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmationTitle, setConfirmationTitle] = useState('');
  const [confirmationDescription, setConfirmationDescription] = useState('');
  const [inputMode, setInputMode] = useState<'url' | 'id'>('url');
  // --- Playlist Service Selection State ---
  const [selectedService, setSelectedService] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedService') || 'spotify';
    }
    return 'spotify';
  });
  // Persist selected service to localStorage
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('selectedService', selectedService);
  }, [selectedService, mounted]);

  // --- Effects ---

  // Check Spotify connection
  useEffect(() => {
    fetch('/api/spotify/me')
      .then(res => res.json())
      .then(data => setSpotifyConnected(data.connected))
      .catch(() => setSpotifyConnected(false));
  }, []);

  useEffect(() => {
    // Check on mount
    fetch('/api/spotify/me')
      .then(res => res.json())
      .then(data => setSpotifyConnected(data.connected))
      .catch(() => setSpotifyConnected(false));

    // Check every 5 minutes
    const interval = setInterval(() => {
      fetch('/api/spotify/me')
        .then(res => res.json())
        .then(data => {
          if (!data.connected) {
            setSpotifyConnected(false);
            toast({
              title: "Spotify Login Required",
              description: "Your Spotify session has expired or is invalid. Please log in again.",
              variant: "destructive",
              position: "top-left"
            });
          }
        })
        .catch(() => {
          setSpotifyConnected(false);
          toast({
            title: "Spotify Login Required",
            description: "Could not verify your Spotify session. Please log in again.",
            variant: "destructive",
            position: "top-left"
          });
        });
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

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

  // Helper to check if a string is a YouTube video ID
  function isYoutubeVideoId(input: string): boolean {
    return /^[\w-]{11}$/.test(input);
  }

  // Helper to build a YouTube URL from a video ID
  function buildYoutubeUrlFromId(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`;
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

  // Fetch genres from Spotify API
  async function fetchSpotifyGenres(): Promise<string[]> {
    try {
      const res = await fetch('/api/spotify/categories');
      if (!res.ok) {
        const data = await res.json();
        toast({
          title: 'Spotify Categories Error',
          description: data.error || 'Could not fetch categories from Spotify.',
          variant: 'destructive',
          position: 'top-left',
        });
        return [];
      }
      const data = await res.json();
      return data.genres || [];
    } catch (err: any) {
      toast({
        title: 'Spotify Categories Error',
        description: err.message || 'Could not fetch categories from Spotify.',
        variant: 'destructive',
        position: 'top-left',
      });
      return [];
    }
  }

  // Fallback AI playlist name generation using YouTube title or a static name
  async function generateAiPlaylistName(songs: Song[]): Promise<string> {
    // Fallback: Use the YouTube video title or a static name
    if (!songs.length) return "TuneFlow Playlist";
    // Try to fetch YouTube title for a more descriptive fallback
    // (Assume getYoutubeVideoId and fetchYoutubeTitle exist in the file)
    try {
      const videoId = getYoutubeVideoId(youtubeLink);
      if (videoId) {
        const ytTitle = await fetchYoutubeTitle(videoId);
        if (ytTitle) return ytTitle + " Playlist";
      }
    } catch (err) {
      console.error('generateAiPlaylistName: Error fetching YouTube title', err);
    }
    return "TuneFlow Playlist";
  }

  // Helper to search Spotify for a track URI
  async function searchSpotifyTrackUri(song: Song, signal?: AbortSignal): Promise<string | null> {
    if (!spotifyConnected) {
      toast({
        title: 'Spotify Login Required',
        description: 'Please connect your Spotify account before searching for songs.',
        variant: 'destructive',
        position: 'top-left',
      });
      return null;
    }
    try {
      const query = `${song.title} ${song.artist}`;
      const res = await fetch('/api/spotify/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query }),
        signal,
      });
      if (!res.ok) {
        const data = await res.json();
        toast({
          title: 'Spotify Search Error',
          description: data.error || 'Could not search for song on Spotify.',
          variant: 'destructive',
          position: 'top-left',
        });
        return null;
      }
      const data = await res.json();
      return data.track?.uri || null;
    } catch (err: any) {
      if (err.name === 'AbortError') return null;
      toast({
        title: 'Spotify Search Error',
        description: err.message || 'Could not search for song on Spotify.',
        variant: 'destructive',
        position: 'top-left',
      });
      return null;
    }
  }

  // --- Improved Spotify Track Search ---
  async function robustSpotifyTrackSearch(song: Song, signal?: AbortSignal): Promise<string | null> {
    if (!spotifyConnected) {
      toast({
        title: 'Spotify Login Required',
        description: 'Please connect your Spotify account before searching for songs.',
        variant: 'destructive',
        position: 'top-left',
      });
      return null;
    }
    // Try several search patterns
    const baseQuery = `${song.title} ${song.artist}`;
    const altQueries = [
      baseQuery,
      song.title,
      `${song.title.replace(/\s*\([^)]*\)/g, '')} ${song.artist}`.trim(), // Remove parentheticals
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
          // Fuzzy match: check if track name contains original song title (case-insensitive, ignoring parentheticals)
          const cleanTitle = song.title.replace(/\s*\([^)]*\)/g, '').toLowerCase();
          if (data.track.name.toLowerCase().includes(cleanTitle) || data.track.name.toLowerCase().includes(song.title.toLowerCase())) {
            return data.track.uri;
          }
          // Accept if artist matches
          if (data.track.artists && data.track.artists.some((a: any) => a.name.toLowerCase().includes(song.artist.toLowerCase()))) {
            return data.track.uri;
          }
          // As fallback, just return the found URI
          return data.track.uri;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return null;
      }
    }
    return null;
  }

  // --- Handlers ---

  const handleParseComments = async (opts?: { fetchMoreComments?: boolean }) => {
    console.log('handleParseComments started');
    if (!youtubeLink) {
      console.warn('YouTube link missing');
      toast({ title: "Input Missing", description: "Please enter a YouTube URL or Video ID.", variant: "destructive", position: 'top-left' });
      return;
    }
    let actualYoutubeUrl = youtubeLink;
    if (inputMode === 'id' && isYoutubeVideoId(youtubeLink)) {
      actualYoutubeUrl = buildYoutubeUrlFromId(youtubeLink);
    }
    if (!scanChapters && !scanDescription && !scanComments) {
      toast({ title: "No Extraction Selected", description: "Please select at least one extraction method.", variant: "destructive", position: 'top-left' });
      return;
    }

    setLoading(true);
    setSongs([]);
    setFailedAlbumArtSongs([]);
    setCanCreatePlaylist(false);
    setShowMoreCommentsPrompt(false);
    setCommentsPage(opts?.fetchMoreComments ? commentsPage + 1 : 1);
    let currentPage = opts?.fetchMoreComments ? commentsPage + 1 : 1;

    const parseToast = toast({ title: 'Starting YouTube Comment Parsing...', description: 'Please wait...', position: 'top-left' });
    console.log('Initiating YouTube comment parsing...');
    setParsingState("Fetching & Parsing Comments");

    const videoId = getYoutubeVideoId(actualYoutubeUrl);
    let errors: string[] = [];
    let allSongs: Song[] = [];

    // --- Chapters extraction (independent) ---
    if (scanChapters) {
      setLoading(true);
      setSongs([]);
      setCanCreatePlaylist(false);
      setParsingState("Fetching & Parsing Chapters");
      toast({ title: 'Starting YouTube Chapters Parsing...', description: 'Please wait...', position: 'top-left' });
      try {
        const videoId = actualYoutubeUrl.includes('watch?v=') ? new URL(actualYoutubeUrl.startsWith('http') ? actualYoutubeUrl : 'https://' + actualYoutubeUrl).searchParams.get('v') : actualYoutubeUrl;
        const resp = await fetch('/api/youtube/chapters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Failed to fetch chapters');
        if (!data.chapters?.length) throw new Error('No chapters found in this video.');
        // Compose a string of all chapter titles for AI
        const chapterText = data.chapters.map((ch: any) => `${ch.start} ${ch.title}`).join('\n');
        setParsingState("Processing Chapters with AI");
        const aiResult: ParseYouTubeCommentOutput = await parseYouTubeComment({ youtubeUrl: actualYoutubeUrl, prioritizePinnedComments: prioritizePinned, scanDescription: false, chapters: chapterText });
        allSongs = allSongs.concat(aiResult.songs.map(song => ({ ...song, imageUrl: song.imageUrl ?? undefined })));
      } catch (err: any) {
        errors.push('Chapters extraction failed: ' + (err.message || String(err)));
      }
    }

    // --- Description extraction (independent) ---
    if (scanDescription) {
      try {
        const resp = await fetch('/api/youtube/description', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Failed to fetch description');
        if (data.description) {
          setParsingState("Processing Description with AI");
          const aiResult: ParseYouTubeCommentOutput = await parseYouTubeComment({ youtubeUrl: actualYoutubeUrl, prioritizePinnedComments: prioritizePinned, scanDescription: true, description: data.description });
          allSongs = allSongs.concat(aiResult.songs.map(song => ({ ...song, imageUrl: song.imageUrl ?? undefined })));
        } else {
          errors.push('No description found in this video.');
        }
      } catch (err: any) {
        errors.push('Description extraction failed: ' + (err.message || String(err)));
      }
    }

    // --- Comments extraction (independent, paginated) ---
    if (scanComments) {
      try {
        setParsingState("Fetching & Parsing Comments");
        const resp = await fetch('/api/youtube/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId, prioritizePinnedComments: prioritizePinned, page: currentPage }),
        });
        const data = await resp.json();
        setCanFetchMoreComments(!!data.canFetchMoreComments);
        if (!resp.ok) throw new Error(data.error || 'Failed to fetch comments');
        if (data.comments?.length) {
          setParsingState("Processing Comments with AI");
          const aiResult: ParseYouTubeCommentOutput = await parseYouTubeComment({ youtubeUrl: actualYoutubeUrl, prioritizePinnedComments: prioritizePinned, scanDescription: false, comments: data.comments });
          allSongs = allSongs.concat(aiResult.songs.map(song => ({ ...song, imageUrl: song.imageUrl ?? undefined })));
        } else {
          errors.push('No comments found with tracklist/songlist in this video.');
        }
        // After 2 pages and no songs, show prompt
        if (scanComments && currentPage >= 2 && allSongs.length === 0 && !!data.canFetchMoreComments) {
          setShowMoreCommentsPrompt(true);
        } else {
          setShowMoreCommentsPrompt(false);
        }
      } catch (err: any) {
        errors.push('Comments extraction failed: ' + (err.message || String(err)));
      }
    }

    // Move songs with unknown/various artists to failed list
    const failedSongs = allSongs.filter(song => {
      const artist = song.artist?.toLowerCase() || '';
      return (
        artist.includes('unknown') ||
        artist.includes('various') ||
        artist.trim() === ''
      );
    });
    const foundSongs = allSongs.filter(song => !failedSongs.includes(song));
    setSongs(foundSongs);
    setFailedAlbumArtSongs(failedSongs);
    setCanCreatePlaylist(foundSongs.length > 0);
    setLoading(false);
    setParsingState(null);
    if (errors.length > 0) {
      toast({
        title: 'Some Extraction Steps Failed',
        description: errors.join('\n'),
        variant: 'destructive',
        position: 'top-left',
      });
    }
  };

  // --- Add handler for the "Check more pages for tracklist?" button ---
  const handleFetchMoreComments = () => {
    handleParseComments({ fetchMoreComments: true });
  };

  const handleClearParsed = () => {
    setConfirmationTitle('Clear Parsed Songs?');
    setConfirmationDescription('Are you sure you want to clear all parsed songs? This action cannot be undone.');
    setConfirmationOpen(true);
  };

  const handleConfirmClearParsed = () => {
    setSongs([]);
    setCanCreatePlaylist(false);
    setParsingState(null);
    setFailedAlbumArtSongs([]); // Clear failed songs in frontend state
    // clearFailedSongs(); // Call helper to clear failed songs everywhere
    sessionStorage.removeItem('parsedSongs');
    sessionStorage.removeItem('youtubeLink');
    // Optionally, clear other session storage related to failed/parsed songs
    setConfirmationOpen(false);
  }

  // --- Helper: Always get correct videoId for title fetch ---
  function getCurrentVideoId() {
    // Always extract videoId regardless of input mode
    if (youtubeLink.includes('watch?v=')) {
      try {
        return new URL(youtubeLink.startsWith('http') ? youtubeLink : 'https://' + youtubeLink).searchParams.get('v') || youtubeLink;
      } catch {
        return youtubeLink;
      }
    } else {
      // Assume raw video ID
      return youtubeLink;
    }
  }

  // --- UI Rendering ---
  // --- Hash helper for unique song keys ---
  function hashSong(song: Song): string {
    // Use a simple hash: title|artist|imageUrl|videoId (if present)
    const base = `${song.title ?? ''}|${song.artist ?? ''}|${song.imageUrl ?? ''}|${song.videoId ?? ''}`;
    let hash = 0, i, chr;
    for (i = 0; i < base.length; i++) {
      chr = base.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit int
    }
    return 'song-' + Math.abs(hash).toString(36);
  }

  return (
    <>
      {!mounted ? null : (
        <div className="flex flex-col items-center justify-start min-h-screen p-4 bg-background text-foreground">
          <Card className="mb-4 relative">
            <CardHeader className="flex flex-row items-start justify-between">
              <CardTitle>Service Connections</CardTitle>
              {songs.length > 0 && (
                <Button
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded flex items-center disabled:opacity-50"
                  onClick={handleClearParsed}
                >
                  Clear Parsed Songs
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4 items-center">
                {/* YouTube Connection Status */}
                <div className="flex items-center space-x-2">
                  {youtubeIcon}
                  <YoutubeStatusBanner youtubeConnected={youtubeConnected} loading={loading} />
                </div>
                {/* Spotify Connection Status */}
                <div className="flex items-center space-x-2">
                  {spotifyIcon}
                  <SpotifyStatusBanner spotifyConnected={spotifyConnected} loading={loading} onConnect={() => window.location.href='/api/spotify/login'} />
                </div>
                {/* Apple Music Placeholder */}
                <div className="flex items-center space-x-2">
                  {appleMusicIcon}
                  <span className="font-semibold text-gray-400">Apple Music</span>
                  <span className="ml-1 text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded">Coming Soon</span>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* YouTube Input Form and Parsed Songs Side-by-Side, Centered and Equal Height */}
          <div className="w-full flex flex-col items-center">
            <div className={`flex w-full max-w-5xl justify-center items-stretch gap-8 mt-4 ${songs.length === 0 && failedAlbumArtSongs.length === 0 ? 'min-h-[440px]' : ''}`}
            >
              {/* Grouped Section: If no songs, center YouTubeInputForm. If songs, show all three in a row */}
              {songs.length === 0 && failedAlbumArtSongs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <Card className="w-full max-w-md h-full min-h-[440px] p-4 rounded-lg shadow-md bg-secondary flex flex-col justify-center">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold flex justify-center items-center text-center w-full">
                        <span role="img" aria-label="music">🎵</span>
                        <span className="mx-2">TuneFlow</span>
                        <span role="img" aria-label="sparkles">✨</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-center">
                      <YouTubeInputForm
                        youtubeLink={youtubeLink}
                        setYoutubeLink={setYoutubeLink}
                        inputMode={inputMode}
                        setInputMode={setInputMode}
                        scanComments={scanComments}
                        setScanComments={setScanComments}
                        scanDescription={scanDescription}
                        setScanDescription={setScanDescription}
                        scanChapters={scanChapters}
                        setScanChapters={setScanChapters}
                        prioritizePinned={prioritizePinned}
                        setPrioritizePinned={setPrioritizePinned}
                        loading={loading}
                        onParse={handleParseComments}
                      />
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex w-full max-w-6xl justify-center items-stretch gap-8 mt-4">
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <Card className="w-full max-w-md h-full min-h-[440px] p-4 rounded-lg shadow-md bg-secondary flex flex-col">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold flex justify-center items-center text-center w-full">
                          <span role="img" aria-label="music">🎵</span>
                          <span className="mx-2">TuneFlow</span>
                          <span role="img" aria-label="sparkles">✨</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col justify-center">
                        <YouTubeInputForm
                          youtubeLink={youtubeLink}
                          setYoutubeLink={setYoutubeLink}
                          inputMode={inputMode}
                          setInputMode={setInputMode}
                          scanComments={scanComments}
                          setScanComments={setScanComments}
                          scanDescription={scanDescription}
                          setScanDescription={setScanDescription}
                          scanChapters={scanChapters}
                          setScanChapters={setScanChapters}
                          prioritizePinned={prioritizePinned}
                          setPrioritizePinned={setPrioritizePinned}
                          loading={loading}
                          onParse={handleParseComments}
                        />
                      </CardContent>
                    </Card>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <ParsedSongsList
                      songs={songs}
                      onClear={handleClearParsed}
                      onFail={(failedSong) => {
                        setFailedAlbumArtSongs((prev) => {
                          if (prev.find(s => s.title === failedSong.title && s.artist === failedSong.artist)) return prev;
                          return [...prev, failedSong];
                        });
                      }}
                      failedAlbumArtSongs={failedAlbumArtSongs}
                    />
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <FailedAlbumArtList failedAlbumArtSongs={failedAlbumArtSongs} />
                  </div>
                </div>
              )}
              {showMoreCommentsPrompt && (
                <div className="flex justify-center mt-4">
                  <PaginationControls
                    currentPage={commentsPage}
                    canFetchMore={canFetchMoreComments}
                    onFetchMore={handleFetchMoreComments}
                    loading={loading}
                  />
                </div>
              )}
            </div>
          </div>
          {/* Swipable Playlist Creation Cards (Tabs) Below */}
          <div className="w-full max-w-md mt-8">
            <Tabs value={selectedService} onValueChange={setSelectedService} className="w-full">
              <TabsList className="w-full flex justify-between mb-4">
                <TabsTrigger value="youtube" className="flex-1">YouTube Playlist</TabsTrigger>
                <TabsTrigger value="spotify" className="flex-1">Spotify Playlist</TabsTrigger>
              </TabsList>
              <TabsContent value="youtube">
                <PlaylistCreateForm
                  songs={songs}
                  service="youtube"
                  playlistName={playlistName}
                  setPlaylistName={setPlaylistName}
                  useAiPlaylistName={useAiPlaylistName}
                  setUseAiPlaylistName={setUseAiPlaylistName}
                  connected={!!youtubeConnected}
                  youtubeLink={youtubeLink}
                  onSuccess={(url) => {
                    toast({
                      title: 'YouTube Playlist Created!',
                      description: (
                        <span>
                          Playlist created successfully!{' '}
                          {url && (
                            <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#ef4444', fontWeight: 'bold', textDecoration: 'underline' }}>
                              Open Playlist
                            </a>
                          )}
                        </span>
                      ),
                      variant: 'default',
                      duration: 10000,
                      position: 'top-right',
                    });
                  }}
                  onError={(err) => toast({ title: 'YouTube Playlist Error', description: err, variant: 'destructive', position: 'top-left' })}
                  failedAlbumArtSongs={failedAlbumArtSongs}
                />
              </TabsContent>
              <TabsContent value="spotify">
                <PlaylistCreateForm
                  songs={songs}
                  service="spotify"
                  playlistName={playlistName}
                  setPlaylistName={setPlaylistName}
                  useAiPlaylistName={useAiPlaylistName}
                  setUseAiPlaylistName={setUseAiPlaylistName}
                  connected={!!spotifyConnected}
                  youtubeLink={youtubeLink}
                  onSuccess={(url) => {
                    setSpotifyPlaylistUrl(url);
                    setSpotifyAllSongsFound(true);
                    toast({
                      title: 'Spotify Playlist Created!',
                      description: (
                        <span>
                          Playlist created successfully!{' '}
                          {url && (
                            <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#22c55e', fontWeight: 'bold', textDecoration: 'underline' }}>
                              Open Playlist
                            </a>
                          )}
                        </span>
                      ),
                      variant: 'default',
                      duration: 10000,
                      position: 'top-right',
                    });
                  }}
                  onError={(err) => toast({ title: 'Spotify Playlist Error', description: err, variant: 'destructive', position: 'top-left' })}
                  failedAlbumArtSongs={failedAlbumArtSongs}
                />
                {/* Render link to Spotify playlist after successful creation */}
                {selectedService === 'spotify' && spotifyPlaylistUrl && (
                  <div className="mt-4 text-center">
                    <a
                      href={spotifyPlaylistUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#22c55e', fontWeight: 'bold', textDecoration: 'underline', fontSize: '1.1rem' }}
                    >
                      Open Playlist
                    </a>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
          {/* Footer */}
          <footer className="w-full max-w-md mx-auto mt-12 mb-4 text-center text-xs text-foreground">
            <hr className="mb-3" />
            <nav>
              <a href="/privacy-policy" className="underline hover:text-primary mr-4 text-foreground">Privacy Policy</a>
              <a href="/terms-of-use" className="underline hover:text-primary mr-4 text-foreground">Terms of Use</a>
              <a href="/gdpr-policy" className="underline hover:text-primary mr-4 text-foreground">GDPR Policy</a>
              <a href="/data-opt-out" className="underline hover:text-primary text-foreground">Data Opt-Out</a>
            </nav>
            <div className="mt-2 text-foreground">&copy; 2025 TuneFlow</div>
          </footer>
          <ConfirmationDialog
            open={confirmationOpen}
            title={confirmationTitle}
            description={confirmationDescription}
            onConfirm={handleConfirmClearParsed}
            onCancel={() => setConfirmationOpen(false)}
          />
        </div>
      )}
    </>
  );
}
