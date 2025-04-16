"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import { parseYouTubeComment, ParseYouTubeCommentOutput } from "@/ai/flows/parse-youtube";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Define Song type locally or in a shared types file if needed elsewhere
type Song = {
  title: string;
  artist: string;
  imageUrl?: string; // Optional album art URL
};

const youtubeIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-2">
    <path d="M21.593 7.203a2.41 2.41 0 00-1.687-1.687C18.244 5.008 12 5.008 12 5.008s-6.244 0-7.906.508a2.41 2.41 0 00-1.687 1.687C2.008 8.865 2.008 12 2.008 12s0 3.135.508 4.797a2.41 2.41 0 001.687 1.687c1.662.508 7.906.508 7.906.508s6.244 0 7.906-.508a2.41 2.41 0 001.687-1.687C21.992 15.135 21.992 12 21.992 12s0-3.135-.407-4.797zM9.5 16.913V7.093l6.857 4.91 0 0-6.857 4.91z"></path>
  </svg>
);

const spotifyIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-2">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.233 16.393c-.274.108-1.635.54-4.477.54-2.827 0-4.202-.432-4.477-.54-.281-.112-.505-.394-.505-.715 0-.46 3.097-.879 3.097-2.894 0-.518-.425-.944-.949-.944-.524 0-.949.425-.949.944 0 1.479-1.954 1.86-1.954 2.667 0 .321.224.603.505.715.274.108 1.635.54 4.477.54 2.827 0 4.202-.432 4.477-.54.281-.112.505-.394.505-.715 0-.483-3.121-.879-3.121-2.894 0-.518.425-.944.949-.944.524 0 .949.425.949.944 0 1.479 1.954 1.86 1.954 2.667 0 .321-.224.603-.505-.715z"></path>
  </svg>
);

export default function Home() {
  const [youtubeLink, setYoutubeLink] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [spotifyUserId, setSpotifyUserId] = useState("");
  const [prioritizePinned, setPrioritizePinned] = useState(false);
  const [scanDescription, setScanDescription] = useState(false);
  const { toast } = useToast();
  const [spotifyReady, setSpotifyReady] = useState(true); // Assume ready for basic search initially
  const [parsingState, setParsingState] = useState<string | null>(null); // More specific state tracking
  const [canCreatePlaylist, setCanCreatePlaylist] = useState(false);

  useEffect(() => {
    console.warn('Spotify Auth Note: Using backend Client Credentials. Playlist creation requires user authorization (Authorization Code Flow) and might fail.');
  }, []);

  const handleParseComments = async () => {
    console.log('handleParseComments started');
    if (!youtubeLink) {
      console.warn('YouTube link missing');
      toast({ title: "Input Missing", description: "Please enter a YouTube URL.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setSongs([]);
    setCanCreatePlaylist(false);
    const parseToast = toast({ title: 'Starting YouTube Comment Parsing...', description: 'Please wait...' });
    console.log('Initiating YouTube comment parsing...');
    setParsingState("Fetching & Parsing Comments");

    try {
      parseToast.update({ id: parseToast.id, title: 'Calling AI Flow...', description: 'Fetching and analyzing comments.' });
      console.log(`Calling parseYouTubeComment for URL: ${youtubeLink}, prioritizePinned: ${prioritizePinned}, scanDescription: ${scanDescription}`);

      const result: ParseYouTubeCommentOutput = await parseYouTubeComment({
        youtubeUrl: youtubeLink,
        prioritizePinnedComments: prioritizePinned,
        scanDescription: scanDescription
      });

      console.log('parseYouTubeComment finished. Result:', result);
      setSongs(
        result.songs.map((song) => ({
          ...song,
          imageUrl: song.imageUrl ?? undefined, // Convert null to undefined for TS compatibility
        }))
      );

      parseToast.update({
        id: parseToast.id,
        title: "Parsing Complete",
        description: `Found ${result.songs.length} potential songs. Check the list below.`,
        // variant: "success" // Commented out as 'success' is not a valid variant
      });
      console.log(`Successfully parsed ${result.songs.length} songs.`);

      if (result.songs.length > 0) {
        setCanCreatePlaylist(true);
      }
    } catch (error: any) {
      console.error('Error during handleParseComments:', error);
      parseToast.update({
        id: parseToast.id,
        title: "Parsing Failed",
        description: error.message || "An unknown error occurred.",
        variant: "destructive"
      });
    } finally {
      console.log('handleParseComments finished.');
      setLoading(false);
      setParsingState(null);
    }
  };

  const handleCreatePlaylist = async () => {
    console.log('handleCreatePlaylist started');
    if (!spotifyUserId) {
      console.warn('Spotify User ID missing');
      toast({ title: "Spotify User ID Required", description: "Please enter your Spotify User ID.", variant: "destructive" });
      return;
    }

    if (songs.length === 0) {
      console.warn('No songs available to create playlist');
      toast({ title: "No Songs", description: "No songs found to add to the playlist.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const playlistToast = toast({ title: 'Starting Playlist Creation...', description: 'Please wait...' });
    setParsingState("Finding Songs on Spotify");

    try {
      let trackUris: string[] = [];
      playlistToast.update({ id: playlistToast.id, title: 'Searching Spotify...', description: `Looking for ${songs.length} songs...` });
      // (Assume trackUris already filled by prior logic or implement search logic as needed)
      // For now, just use song titles as placeholders
      // You should have logic to get the Spotify track URIs for each song
      // ...
      // For demo, skip Spotify search and use song titles
      // ---
      // Actually, you may want to keep your search logic here, but the playlist creation request below should go to /api/spotify/playlist

      // --- Playlist Creation Request ---
      let playlistName = `YT Comments: Unknown Video`;
      try {
         playlistName = `YT Comments: ${new URL(youtubeLink).searchParams.get('v') || 'Playlist'}`;
      } catch { /* ignore URL parsing errors for name */ }

      const createResponse = await fetch('/api/spotify/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: spotifyUserId,
          playlistName: playlistName,
          trackUris: trackUris,
        }),
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

      console.log('Playlist creation response status:', createResponse.status);
      console.log('Playlist creation response data:', createData);

      if (!createResponse.ok) {
         if (createData.error === 'No Spotify access token found. Please connect your Spotify account.') {
           toast({ title: 'Spotify Login Required', description: 'Please connect your Spotify account before creating a playlist.', variant: 'destructive' });
           playlistToast.update({ id: playlistToast.id, title: 'Spotify Login Required', description: 'Connect your Spotify account and try again.', variant: 'destructive' });
           return;
         }
         const errorMessage = createData?.error || createData?.message || `Failed to create playlist (Status: ${createResponse.status})`;
         playlistToast.update({
           id: playlistToast.id,
           title: "Playlist Creation Failed",
           description: errorMessage,
           variant: "destructive"
         });
         throw new Error(errorMessage);
      } else {
         playlistToast.update({
           id: playlistToast.id,
           title: "Playlist Created!",
           description: `Playlist '${playlistName}' created successfully!`,
         });
         toast({ title: "Playlist Created!", description: `Playlist '${playlistName}' created successfully!`, variant: "default" });
         console.log(`Successfully created playlist ID: ${createData.playlistId}`);
      }
    } catch (error: any) {
      console.error("Error during handleCreatePlaylist:", error);
      playlistToast.update({
        id: playlistToast.id,
        title: "Playlist Creation Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setParsingState(null);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 bg-background text-foreground">
      <Card className="w-full max-w-md p-4 rounded-lg shadow-md bg-secondary">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">TuneFlow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
           {/* YouTube Input Section */}
           <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {youtubeIcon}
                <Label htmlFor="youtube-link">YouTube Video Link</Label>
              </div>
              <Input
                id="youtube-link"
                type="url"
                placeholder="Enter YouTube Video URL (e.g., ...watch?v=...)"
                value={youtubeLink}
                onChange={(e) => setYoutubeLink(e.target.value)}
                className="rounded-md"
                disabled={loading}
              />
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="prioritize-pinned"
                  checked={prioritizePinned}
                  onCheckedChange={(checked) => setPrioritizePinned(Boolean(checked))}
                  disabled={loading}
                />
                <Label htmlFor="prioritize-pinned" className="text-sm text-muted-foreground">
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
              <Button
                onClick={handleParseComments}
                disabled={loading || !youtubeLink}
                className="w-full rounded-md"
              >
                {loading && parsingState === 'Fetching & Parsing Comments' ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    {parsingState}
                  </>
                ) : (
                  "Parse YouTube Comments"
                )}
              </Button>
            </div>

            {/* Spotify Connect Section */}
            <div className="w-full flex justify-center my-4">
              <Button
                onClick={() => {
                  window.location.href = '/api/spotify/login';
                }}
                className="rounded-md bg-green-700 text-white hover:bg-green-800"
              >
                Connect to Spotify
              </Button>
            </div>

            {/* Spotify Playlist Creation Section - Enabled after successful parsing */}
            {canCreatePlaylist && (
            <div className="space-y-2 pt-4 border-t">
              <Button
                onClick={handleCreatePlaylist}
                disabled={loading || songs.length === 0}
                className="w-full rounded-md bg-green-600 text-white hover:bg-green-700 disabled:bg-green-800"
              >
                {loading && (parsingState?.includes('Spotify') || parsingState === 'Finding Songs on Spotify' || parsingState === 'Creating Playlist' || parsingState?.includes('Searching:')) ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    {parsingState}
                  </>
                ) : (
                  "Create Spotify Playlist"
                )}
              </Button>
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
              {songs.map((song, index) => (
                <li key={index} className="flex items-center text-sm border-b pb-1">
                  {/* Album Art */}
                  {song.imageUrl ? (
                    <img
                      src={song.imageUrl}
                      alt={song.title + ' album art'}
                      className="w-10 h-10 object-cover rounded mr-3 border"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-10 h-10 mr-3 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground border">
                      N/A
                    </div>
                  )}
                  <div>
                    <span className="font-medium">{song.title}</span>
                    {" - "}
                    <span className="text-muted-foreground">{song.artist}</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
