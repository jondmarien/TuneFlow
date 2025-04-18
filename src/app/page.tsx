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

  // --- State Hooks ---
  function getSessionSongs() {
    try {
      const s = sessionStorage.getItem('parsedSongs');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  }
  function getSessionYoutubeLink() {
    try {
      return sessionStorage.getItem('youtubeLink') || '';
    } catch {
      return '';
    }
  }
  const [youtubeLink, setYoutubeLink] = useState<string>(getSessionYoutubeLink());
  const [songs, setSongs] = useState<Song[]>(getSessionSongs());
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
  const [abortPlaylist, setAbortPlaylist] = useState(false);
  const [playlistAbortController, setPlaylistAbortController] = useState<AbortController | null>(null);
  const [failedAlbumArtSongs, setFailedAlbumArtSongs] = useState<Song[]>([]);
  const [spotifySearchStatus, setSpotifySearchStatus] = useState<'idle' | 'searching' | 'done'>('idle');
  const [spotifySongSearches, setSpotifySongSearches] = useState<{ song: Song; status: 'pending' | 'searching' | 'found' | 'not_found' }[]>([]);
  const [currentSpotifySearchSong, setCurrentSpotifySearchSong] = useState<Song | null>(null);
  const [spotifyPlaylistUrl, setSpotifyPlaylistUrl] = useState<string | null>(null);
  const [spotifyAllSongsFound, setSpotifyAllSongsFound] = useState<boolean | null>(null);

  // --- Add state for comment pagination and prompt ---
  const [commentsPage, setCommentsPage] = useState(1);
  const [showMoreCommentsPrompt, setShowMoreCommentsPrompt] = useState(false);
  const [canFetchMoreComments, setCanFetchMoreComments] = useState(false);

  // --- Confirmation Dialog State ---
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmationTitle, setConfirmationTitle] = useState('');
  const [confirmationDescription, setConfirmationDescription] = useState('');

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

  const [inputMode, setInputMode] = useState<'url' | 'id'>('url');

  // Persist youtubeLink and songs to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('youtubeLink', youtubeLink);
  }, [youtubeLink]);
  useEffect(() => {
    sessionStorage.setItem('parsedSongs', JSON.stringify(songs));
  }, [songs]);

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

    setSongs(allSongs);
    setCanCreatePlaylist(allSongs.length > 0);
    setParsingState(null);
    setLoading(false);

    // Persist after parse
    sessionStorage.setItem('youtubeLink', youtubeLink);
    sessionStorage.setItem('parsedSongs', JSON.stringify(allSongs));

    if (errors.length) {
      toast({
        title: allSongs.length > 0 ? 'Some Extractions Failed' : 'Extraction Failed',
        description: errors.join(' | '),
        variant: allSongs.length > 0 ? 'default' : 'destructive',
        position: 'top-left',
      });
    } else if (allSongs.length === 0) {
      toast({
        title: 'No Songs Found',
        description: 'No songs could be extracted from the selected sources.',
        variant: 'destructive',
        position: 'top-left',
      });
    }
  };

  // --- Add handler for the "Check more pages for tracklist?" button ---
  const handleFetchMoreComments = () => {
    handleParseComments({ fetchMoreComments: true });
  };

  const handleCreatePlaylist = async () => {
    setAbortPlaylist(false);
    const abortController = new AbortController();
    setPlaylistAbortController(abortController);
    console.log('handleCreatePlaylist started');
    if (!spotifyConnected) {
      toast({ title: 'Spotify Login Required', description: 'Please connect your Spotify account before creating a playlist.', variant: 'destructive', position: 'top-left' });
      return;
    }
    if (songs.length === 0) {
      console.warn('No songs available to create playlist');
      toast({ title: "No Songs", description: "No songs found to add to the playlist.", variant: "destructive", position: 'top-left' });
      return;
    }
    setLoading(true);
    setSpotifySearchStatus('searching');
    setSpotifySongSearches(songs.map(song => ({ song, status: 'pending' })));
    setCurrentSpotifySearchSong(null); // Reset before starting
    setSpotifyPlaylistUrl(null); // Reset before starting
    setSpotifyAllSongsFound(null); // Reset before starting
    const playlistToast = toast({ title: 'Starting Playlist Creation...', description: 'Please wait...', position: 'top-left' });
    setParsingState("Finding Songs on Spotify");
    let finalPlaylistName = playlistName;
    try {
      if (!useAiPlaylistName) {
        // Use YouTube video title (robust for both URL and ID input)
        const videoId = getCurrentVideoId();
        if (videoId) {
          const ytTitle = await fetchYoutubeTitle(videoId);
          if (ytTitle) {
            finalPlaylistName = ytTitle;
          } else {
            toast({ title: 'YouTube Title Error', description: 'Could not fetch YouTube video title. Using fallback name.', variant: 'destructive', position: 'top-left' });
            finalPlaylistName = 'TuneFlow Playlist';
          }
        } else {
          toast({ title: 'YouTube Link Error', description: 'Could not extract video ID from YouTube link. Using fallback name.', variant: 'destructive', position: 'top-left' });
          finalPlaylistName = 'TuneFlow Playlist';
        }
      } else {
        // Use AI-generated name, but fail if genres can't be fetched
        finalPlaylistName = await generateAiPlaylistName(songs);
      }
      setPlaylistName(finalPlaylistName);
      // Find Spotify track URIs for all parsed songs (robust search)
      let trackUris: string[] = [];
      let failedSongs: Song[] = [];
      for (let i = 0; i < songs.length; i++) {
        if (abortPlaylist) throw new Error('Playlist creation stopped by user.');
        setCurrentSpotifySearchSong(songs[i]); // <-- Set current song being searched
        setSpotifySongSearches(prev => prev.map((entry, idx) => idx === i ? { ...entry, status: 'searching' } : entry));
        const uri = await robustSpotifyTrackSearch(songs[i], abortController.signal);
        if (uri) {
          trackUris.push(uri);
          setSpotifySongSearches(prev => prev.map((entry, idx) => idx === i ? { ...entry, status: 'found' } : entry));
        } else {
          failedSongs.push(songs[i]);
          setSpotifySongSearches(prev => prev.map((entry, idx) => idx === i ? { ...entry, status: 'not_found' } : entry));
          setFailedAlbumArtSongs(prev => {
            // Only add if not already present
            if (prev.find(s => s.title === songs[i].title && s.artist === songs[i].artist)) return prev;
            return [...prev, songs[i]];
          });
          // Try fallback album art for failed songs (iTunes, then MusicBrainz)
          fetchFallbackAlbumArt(songs[i]).then((art: string | null) => {
            if (art) {
              setFailedAlbumArtSongs(prev => prev.map(s => s.title === songs[i].title && s.artist === songs[i].artist ? { ...s, imageUrl: art } : s));
            }
          });
        }
      }
      setCurrentSpotifySearchSong(null); // Clear at the end
      setSpotifySearchStatus('done');
      setFailedAlbumArtSongs(prev => {
        // Only add missing failedSongs (should be a no-op if already added above)
        const all = [...prev];
        for (const fs of failedSongs) {
          if (!all.find(s => s.title === fs.title && s.artist === fs.artist)) {
            all.push(fs);
          }
        }
        return all;
      });
      // Fetch Spotify user ID
      if (abortPlaylist) throw new Error('Playlist creation stopped by user.');
      const userRes = await fetch('/api/spotify/me', { signal: abortController.signal });
      const userData = await userRes.json();
      if (!userData.id) {
        playlistToast.update({
          id: playlistToast.id,
          title: 'Spotify User Error',
          description: 'Could not fetch Spotify user ID.',
          variant: 'destructive',
          position: 'top-left',
        });
        setLoading(false);
        setParsingState(null);
        setSpotifySearchStatus('idle');
        return;
      }
      const userId = userData.id;
      // --- Playlist Creation Request ---
      if (abortPlaylist) throw new Error('Playlist creation stopped by user.');
      const createResponse = await fetch('/api/spotify/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          playlistName: finalPlaylistName,
          trackUris,
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
        playlistToast.update({
          id: playlistToast.id,
          title: "Playlist Creation Failed",
          description: errorMessage,
          variant: "destructive",
          position: 'top-left',
        });
        throw new Error(errorMessage);
      } else {
        playlistToast.dismiss();
        setSpotifyPlaylistUrl(createData.playlistUrl || null);
        setSpotifyAllSongsFound(failedSongs.length === 0);
        // Show green, non-fading toast with playlist URL
        playlistToast.update({
          id: playlistToast.id,
          title: 'Playlist Created!',
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
          variant: 'default',
          duration: 1000000,
          position: 'top-right',
        });
        toast({
          title: 'Playlist Created!',
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
          variant: 'default',
          duration: 1000000,
          position: 'top-right',
        });
        console.log(`Successfully created playlist '${finalPlaylistName}' with ${trackUris.length} tracks. Spotify URL:`, createData.playlistUrl);
        if (createData.playlistUrl) {
          console.log('Playlist URL:', createData.playlistUrl);
        }
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
        console.error("Error during handleCreatePlaylist:", err);
        return;
      }
      setLoading(false);
      setParsingState(null);
      toast({
        title: 'Playlist Creation Error',
        description: err.message || 'Could not create Spotify playlist.',
        variant: 'destructive',
        position: 'top-left',
      });
      console.error('Playlist Creation Error:', err);
    } finally {
      setLoading(false);
      setParsingState(null);
      setAbortPlaylist(false);
      setPlaylistAbortController(null);
      setCurrentSpotifySearchSong(null);
    }
  };

  const handleStopPlaylist = () => {
    if (playlistAbortController) {
      playlistAbortController.abort();
    }
    setAbortPlaylist(true);
  };

  useEffect(() => {
    if (abortPlaylist) {
      setLoading(false);
      setParsingState(null);
      toast({
        title: 'Playlist Creation Stopped',
        description: 'Playlist creation was aborted by the user.',
        variant: 'destructive',
        position: 'top-left',
      });
    }
  }, [abortPlaylist]);

  const handleCreateYouTubePlaylist = async () => {
    if (!youtubeConnected) {
      toast({ title: 'YouTube Login Required', description: 'Please connect your YouTube (Google) account before creating a playlist.', variant: 'destructive', position: 'top-left' });
      return;
    }
    if (songs.length === 0) {
      toast({ title: 'No Songs', description: 'No songs available to create a YouTube playlist.', variant: 'destructive', position: 'top-left' });
      return;
    }
    setLoading(true);
    try {
      // --- Get videoIds from songs ---
      const videoIds = songs.map(song => song.videoId).filter((id): id is string => Boolean(id));

      // --- Get YouTube video title for playlist name ---
      let playlistTitle = 'TuneFlow Playlist';
      const videoId = getYoutubeVideoId(youtubeLink);
      if (videoId) {
        const ytTitle = await fetchYoutubeTitle(videoId);
        if (ytTitle) playlistTitle = ytTitle;
      }

      // --- Create playlist with correct title and videoIds ---
      const res = await fetch('/api/youtube/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlistName: playlistTitle,
          description: `Created with TuneFlow from YouTube comments`,
          videoIds: videoIds.length > 0 ? videoIds : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'YouTube Playlist Error', description: data.error || 'Could not create YouTube playlist.', variant: 'destructive', position: 'top-left' });
        setLoading(false);
        return;
      }
      toast({
        title: 'Playlist Created!',
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
        variant: 'default',
        duration: 10000,
        position: 'top-right',
      });
    } catch (err: any) {
      toast({ title: 'YouTube Playlist Error', description: err.message || 'Could not create YouTube playlist.', variant: 'destructive', position: 'top-left' });
    } finally {
      setLoading(false);
    }
  };

  const clearFailedSongs = () => {
    setFailedAlbumArtSongs([]); // frontend state
    sessionStorage.removeItem('failedSongs'); // for persisting failed songs in sessionStorage
    // Clear failed songs in Redis using standardized cache key
    const videoId = getYoutubeVideoId(youtubeLink);
    if (videoId) {
      const cacheKey = `failed_songs:${videoId}`;
      fetch('/api/clear-failed-songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cacheKey })
      });
    } else {
      // fallback: clear generic key if videoId is not available
      fetch('/api/clear-failed-songs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cacheKey: 'failed_songs' }) });
    }
  }

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
    clearFailedSongs(); // Call helper to clear failed songs everywhere
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
              <span className="font-semibold text-red-600">YouTube</span>
              {youtubeConnected ? (
                <span className="ml-1 text-xs px-2 py-0.5 rounded bg-[#f8d7da]" style={{ backgroundColor: '#f8d7da', color: '#f472b6', fontWeight: 600, border: '1px solid #fca5a5', minWidth: 90, display: 'inline-block', textAlign: 'center' }}>
                  CONNECTED!
                </span>
              ) : (
                <Button variant="outline" size="sm" className="ml-2 border-red-500 text-red-600 hover:bg-red-50" onClick={() => signIn('google')}>Connect</Button>
              )}
            </div>
            {/* Spotify Connection Status */}
            <div className="flex items-center space-x-2">
              {spotifyIcon}
              <span className="font-semibold" style={{ color: '#1DB954' }}>Spotify</span>
              {spotifyConnected ? (
                <span className="ml-1 text-xs px-2 py-0.5 rounded bg-[#d1fae5]" style={{ backgroundColor: '#d1fae5', color: '#059669', fontWeight: 600, border: '1px solid #6ee7b7', minWidth: 90, display: 'inline-block', textAlign: 'center' }}>
                  CONNECTED!
                </span>
              ) : (
                <SpotifyStatusBanner spotifyConnected={spotifyConnected} loading={loading} onConnect={() => window.location.href='/api/spotify/login'} />
              )}
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
      <Card className="w-full max-w-md p-4 rounded-lg shadow-md bg-secondary mt-4">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex justify-center items-center text-center w-full">
            <span role="img" aria-label="music">🎵</span>
            <span className="mx-2">TuneFlow</span>
            <span role="img" aria-label="sparkles">✨</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
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
      {/* Break between YouTubeInputForm and Parsed Songs */}
      <div className="my-6 w-full flex justify-center">
        <hr className="w-full max-w-md border-t-2 border-gray-200" />
      </div>
      <Card className="w-full max-w-md p-4 rounded-lg shadow-md bg-secondary">
        <CardHeader className="flex flex-row items-start justify-between">
          <CardTitle className="text-lg font-semibold">Parsed Songs ({songs.length})</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearParsed}
            disabled={songs.length === 0}
          >
            Clear
          </Button>
        </CardHeader>
        <CardContent>
          <SongList
            songs={songs}
            onFail={(failedSong) => {
              setFailedAlbumArtSongs((prev) => {
                if (prev.find(s => s.title === failedSong.title && s.artist === failedSong.artist)) return prev;
                return [...prev, failedSong];
              });
            }}
          />
        </CardContent>
      </Card>
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
      {failedAlbumArtSongs.length > 0 && (
        <div className="mt-6">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm mb-6" style={{ background: 'var(--card-bg,rgba(238, 157, 146, 0.66))' }}>
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
  );
}
