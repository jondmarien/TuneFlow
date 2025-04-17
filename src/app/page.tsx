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

// Define Song type locally or in a shared types file if needed elsewhere
type Song = {
  title: string;
  artist: string;
  imageUrl?: string; // Optional album art URL
  videoId?: string;  // Optional YouTube video ID
};

// Helper type guard for accessToken
function hasAccessToken(session: Session | null | undefined): session is Session & { accessToken: string } {
  return !!session && typeof (session as any).accessToken === 'string';
}

// YouTube SVG icon (red and white official logo)
const youtubeIcon = (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2">
    <rect width="24" height="24" rx="4" fill="#FF0000"/>
    <path d="M9.5 16.913V7.093l6.857 4.91-6.857 4.91z" fill="#fff"/>
  </svg>
);

// Spotify SVG icon (high-res official logo)
const spotifyIcon = (
  <svg viewBox="0 0 168 168" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2">
    <circle cx="84" cy="84" r="84" fill="#1DB954" />
    <path d="M120.8 115.6c-2.1 0-3.5-.7-5.1-1.7-14-8.6-31.7-10.5-52.7-6.2-2.2.4-4.2-1-4.6-3.2-.4-2.2 1-4.2 3.2-4.6 22.8-4.7 42.1-2.6 57.3 6.4 1.9 1.1 2.5 3.6 1.4 5.5-.7 1.2-2 1.8-3.5 1.8zm7.6-16.3c-2.3 0-3.7-.9-5.2-1.8-16.5-10.1-44.1-13-64.8-7.6-2.4.6-4.8-.8-5.4-3.2-.6-2.4.8-4.8 3.2-5.4 23.2-5.9 52.2-2.8 70.7 8.5 2.1 1.3 2.8 4 1.5 6.1-.8 1.3-2.2 2-3.6 2zm8.6-17.6c-2.4 0-3.9-.8-5.6-1.8-18.1-10.7-48.4-11.7-66-.7-2.6 1.1-5.5-.1-6.6-2.7-1.1-2.6.1-5.5 2.7-6.6 20.1-8.6 53.2-7.5 73.6.9 2.7 1.1 4 4.2 2.9 6.9-.8 2.1-2.6 3.4-4.6 3.4z" fill="#fff"/>
  </svg>
);

// Apple Music SVG icon (SVG Apple logo, not unicode)
const appleMusicIcon = (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2">
    <circle cx="12" cy="12" r="12" fill="#fff" stroke="#ccc" strokeWidth="1" />
    <path d="M16.365 8.505c-.353.414-.93.736-1.47.692-.07-.66.2-1.36.54-1.8.37-.47 1.02-.8 1.56-.83.08.7-.2 1.41-.63 1.94zm-1.19.97c.02 1.12.97 1.49.99 1.5-.01.03-.16.56-.52 1.1-.32.47-.65.93-1.18.94-.52.01-.69-.3-1.29-.3-.6 0-.79.29-1.28.3-.52.01-.9-.5-1.22-.97-.66-.96-1.16-2.73-.48-3.93.33-.58.92-.95 1.56-.96.49-.01.95.33 1.29.33.33 0 .87-.41 1.47-.35.25.01.96.1 1.41.75-.04.03-.84.49-.83 1.46zm-2.25-3.03c-.08-.6.18-1.23.55-1.63.37-.4.97-.71 1.54-.62.06.63-.18 1.26-.54 1.67-.36.41-.95.73-1.55.58z" fill="#000"/>
  </svg>
);

/**
 * Custom React Hook: useAlbumArtWithFailure
 *
 * Polls the /api/album-art endpoint for a song's album art up to 3 times.
 * If album art is not found after 3 attempts, triggers onFail callback.
 *
 * @param song - The song object (title, artist, etc.)
 * @param onFail - Callback to call if album art fails after 3 tries
 * @returns imageUrl - The album art URL (if found)
 */
function useAlbumArtWithFailure(song: Song, onFail: (song: Song) => void) {
  const [imageUrl, setImageUrl] = useState(song.imageUrl ?? null);
  const [failCount, setFailCount] = useState(0);

  useEffect(() => {
    if (imageUrl || failCount >= 3) return;
    let cancelled = false;

    async function poll() {
      const res = await fetch(`/api/album-art?title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}`);
      const data = await res.json();

      if (cancelled) return;

      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
      } else {
        if (failCount < 2) {
          setTimeout(poll, 2000);
          setFailCount((c) => c + 1);
        } else {
          setFailCount((c) => c + 1);
          // Mark as failed after 3 tries
          onFail(song);
        }
      }
    }

    poll();
    return () => { cancelled = true; };
  }, [song.title, song.artist, imageUrl, failCount]);

  return imageUrl;
}

/**
 * SongItem Component
 *
 * Renders a single song in the list, showing album art (if available) or a placeholder.
 * Uses the polling hook to fetch album art and triggers onFail if not found after 3 tries.
 *
 * @param song - The song object
 * @param onFail - Callback for failed album art
 */
function SongItem({ song, onFail }: { song: Song, onFail: (song: Song) => void }) {
  const imageUrl = useAlbumArtWithFailure(song, onFail);

  return (
    <li className="flex items-center text-sm border-b pb-1">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`${song.title} album art`}
          className="w-10 h-10 object-cover rounded mr-3 border"
        />
      ) : (
        <div className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded mr-3 border text-xs text-gray-500">N/A</div>
      )}
      <div>
        <div className="font-semibold">{song.title}</div>
        <div className="text-xs text-gray-500">{song.artist}</div>
      </div>
    </li>
  );
}

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
    if (!songs.length) return "AI Playlist";
    // Try to fetch YouTube title for a more descriptive fallback
    // (Assume getYoutubeVideoId and fetchYoutubeTitle exist in the file)
    try {
      const videoId = getYoutubeVideoId(youtubeLink);
      if (videoId) {
        const ytTitle = await fetchYoutubeTitle(videoId);
        if (ytTitle) return ytTitle + " Playlist";
      }
    } catch {}
    return "AI Playlist";
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

  // --- Handlers ---

  const handleParseComments = async () => {
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

    const parseToast = toast({ title: 'Starting YouTube Comment Parsing...', description: 'Please wait...', position: 'top-left' });
    console.log('Initiating YouTube comment parsing...');
    setParsingState("Fetching & Parsing Comments");

    const videoId = getYoutubeVideoId(actualYoutubeUrl);
    let errors: string[] = [];
    let allSongs: Song[] = [];

    // Chapters extraction
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

    // Description extraction
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

    // Comments extraction
    if (scanComments) {
      try {
        setParsingState("Fetching & Parsing Comments");
        const resp = await fetch('/api/youtube/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId, prioritizePinnedComments: prioritizePinned }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Failed to fetch comments');
        if (data.comments?.length) {
          setParsingState("Processing Comments with AI");
          const aiResult: ParseYouTubeCommentOutput = await parseYouTubeComment({ youtubeUrl: actualYoutubeUrl, prioritizePinnedComments: prioritizePinned, scanDescription: false, comments: data.comments });
          allSongs = allSongs.concat(aiResult.songs.map(song => ({ ...song, imageUrl: song.imageUrl ?? undefined })));
        } else {
          errors.push('No comments found with tracklist/songlist in this video.');
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
    const playlistToast = toast({ title: 'Starting Playlist Creation...', description: 'Please wait...', position: 'top-left' });
    setParsingState("Finding Songs on Spotify");
    let finalPlaylistName = playlistName;
    try {
      if (!useAiPlaylistName) {
        // Use YouTube video title
        const videoId = getYoutubeVideoId(youtubeLink);
        if (videoId) {
          const ytTitle = await fetchYoutubeTitle(videoId);
          finalPlaylistName = ytTitle ? ytTitle : `YouTube Playlist`;
        } else {
          finalPlaylistName = `YouTube Playlist`;
        }
      } else {
        // Use AI-generated name, but fail if genres can't be fetched
        finalPlaylistName = await generateAiPlaylistName(songs);
      }
      setPlaylistName(finalPlaylistName);
      // Find Spotify track URIs for all parsed songs
      let trackUris: string[] = [];
      for (const song of songs) {
        if (abortPlaylist) throw new Error('Playlist creation stopped by user.');
        const uri = await searchSpotifyTrackUri(song, abortController.signal);
        if (uri) trackUris.push(uri);
      }
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
        console.log(`Successfully created playlist ID: ${createData.playlistId}`);
        if (createData.playlistUrl) {
          console.log('Playlist URL:', createData.playlistUrl);
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message === 'Playlist creation stopped by user.') {
        toast({
          title: 'Playlist Creation Stopped',
          description: 'Playlist creation was aborted by the user.',
          variant: 'destructive',
          position: 'top-left',
        });
      } else {
        console.error("Error during handleCreatePlaylist:", error);
        toast({
          title: "Playlist Creation Failed",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive",
          position: 'top-left',
        });
      }
    } finally {
      setLoading(false);
      setParsingState(null);
      setAbortPlaylist(false);
      setPlaylistAbortController(null);
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

  function handleClearParsed() {
    setYoutubeLink('');
    setSongs([]);
    sessionStorage.removeItem('youtubeLink');
    sessionStorage.removeItem('parsedSongs');
  }

  // --- UI Rendering ---
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
            {/* Spotify Connection Status + Connect Button */}
            <div className="flex items-center space-x-2">
              {spotifyIcon}
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
                  onClick={() => window.location.href='/api/spotify/login'}
                >
                  Connect
                </Button>
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
      <Card className="w-full max-w-md p-4 rounded-lg shadow-md bg-secondary">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex justify-center items-center text-center w-full">
            <span role="img" aria-label="music">🎵</span>
            <span className="mx-2">TuneFlow</span>
            <span role="img" aria-label="sparkles">✨</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Input Mode Toggle */}
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
          {/* YouTube Input Section */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 justify-center">
              <Label htmlFor="youtube-link" className="text-sm text-muted-foreground text-center w-full flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                  <rect width="24" height="24" rx="4" fill="#FF0000"></rect>
                  <path d="M9.5 16.913V7.093l6.857 4.91-6.857 4.91z" fill="#fff"></path>
                </svg>
                Youtube Video Link
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
            <span
              title={spotifyConnected !== true ? "Please login to Spotify" : undefined}
              className="block w-full"
            >
              <Button
                onClick={handleParseComments}
                disabled={loading || !youtubeLink}
                className="w-full rounded-md bg-blue-700 hover:bg-blue-400 text-white font-semibold shadow disabled:cursor-not-allowed transition-colors duration-150"
              >
                {loading && parsingState === 'Fetching & Parsing Comments / Description' ? (
                  <span className="flex items-center"><Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> Parsing...</span>
                ) : (
                  'Parse YouTube Video Information'
                )}
              </Button>
            </span>
          </div>

          {/* Move grouped playlist buttons below input section */}
          <div className="flex flex-col gap-2 my-6">
            {spotifyConnected && songs.length > 0 && (
              <Button
                className="bg-[#1DB954] hover:bg-[#1ed760] text-white font-bold py-2 px-4 rounded flex items-center disabled:opacity-50"
                onClick={handleCreatePlaylist}
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
                  <path d="M12 0C5.371 0 0 5.371 0 12c0 6.627 5.371 12 12 12s12-5.373 12-12C24 5.371 18.629 0 12 0zm5.379 17.414a.956.956 0 0 1-1.313.318c-3.594-2.203-8.146-2.695-13.521-1.461a.958.958 0 1 1-.428-1.871c5.771-1.319 10.771-.771 14.707 1.631a.956.956 0 0 1 .555 1.383zm1.188-2.635a1.195 1.195 0 0 1-1.638.398c-4.109-2.527-10.381-3.266-15.229-1.77a1.197 1.197 0 1 1-.674-2.302c5.381-1.572 12.184-.752 16.824 2.047a1.195 1.195 0 0 1 .517 1.627zm.125-2.693C15.547 9.76 8.453 9.719 4.063 11.063a1.436 1.436 0 1 1-.812-2.754c5.016-1.482 13.016-1.438 17.688 1.125a1.438 1.438 0 0 1-1.438 2.484z" fill="#fff"/>
                </svg>
                Create Playlist on Spotify
              </Button>
            )}
            {youtubeConnected && songs.length > 0 && (
              <Button
                className="bg-[#c4302b] hover:bg-[#ff4e45] text-white font-bold py-2 px-4 rounded flex items-center disabled:opacity-50 border border-[#c4302b] transition-colors duration-150"
                style={{ boxShadow: '0 1px 4px #c4302b33' }}
                onClick={handleCreateYouTubePlaylist}
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2"><path d="M21.593 7.203a2.41 2.41 0 00-1.687-1.687C18.244 5.008 12 5.008 12 5.008s-6.244 0-7.906.508a2.41 2.41 0 00-1.687 1.687C2.008 8.865 2.008 12 2.008 12s0 3.135.508 4.797a2.41 2.41 0 001.687 1.687c1.662.508 7.906.508 7.906.508s6.244 0 7.906-.508a2.41 2.41 0 001.687-1.687C21.992 15.135 21.992 12 21.992 12s0-3.135-.407-4.797zM9.5 16.913V7.093l6.857 4.91 0 0-6.857 4.91z"></path></svg>
                <span style={{ color: 'white' }}>Create Playlist on YouTube</span>
              </Button>
            )}
          </div>

          {/* Spotify Playlist Creation Section - Enabled after successful parsing */}
          {canCreatePlaylist && (
            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center gap-2 pb-2">
                <Checkbox
                  id="ai-playlist-name"
                  checked={useAiPlaylistName}
                  onCheckedChange={() => {}}
                  disabled
                />
                <Label htmlFor="ai-playlist-name" className="text-sm text-muted-foreground">
                  Use AI to generate playlist name
                </Label>
                <span className="text-xs italic" style={{ color: 'red' }}>(DISABLED UNTIL I CAN FIND A SUITABLE FIX)</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Display Parsed Songs */}
      {songs.length > 0 && (
        <Card className="w-full max-w-md mt-4 p-4 rounded-lg shadow-md bg-secondary">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Parsed Songs ({songs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {songs.map((song) => (
                <SongItem key={`${song.title}-${song.artist}`} song={song} onFail={(failedSong) => {
                  setFailedAlbumArtSongs((prev) => {
                    // Only add if not already present
                    if (prev.find(s => s.title === failedSong.title && s.artist === failedSong.artist)) return prev;
                    return [...prev, failedSong];
                  });
                }} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      {failedAlbumArtSongs.length > 0 && (
        <div className="mt-6">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm mb-6" style={{ background: 'var(--card-bg,rgba(238, 157, 146, 0.66))' }}>
            <div className="flex items-center justify-between px-6 pt-6">
              <h3 className="text-lg font-semibold">Songs Failed to Parse (Album Art or Search)</h3>
            </div>
            <div className="p-6 pt-0">
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {failedAlbumArtSongs.map(song => (
                  <li key={`fail-${song.title}-${song.artist}`} className="flex items-center text-sm border-b pb-1">
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
          <a href="/docs/PRIVACY_POLICY.md" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary mr-4 text-foreground">Privacy Policy</a>
          <a href="/docs/TERMS_OF_USE.md" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary text-foreground">Terms of Use</a>
        </nav>
        <div className="mt-2 text-foreground">&copy; 2025 TuneFlow</div>
      </footer>
    </div>
  );
}
