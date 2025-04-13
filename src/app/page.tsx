"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Removed: import { Song } from "@/services/spotify";
// Removed: import { authenticateSpotify, searchSong, createPlaylist } from "@/services/spotify";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import { parseYouTubeComment, ParseYouTubeCommentOutput } from "@/ai/flows/parse-youtube-comment";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Define Song type locally or in a shared types file if needed elsewhere
type Song = {
  title: string;
  artist: string;
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
  const [spotifyUserId, setSpotifyUserId] = useState(""); // Still needed for playlist creation endpoint
  const [prioritizePinned, setPrioritizePinned] = useState(false);
  const { toast } = useToast();
  // NOTE: True user authentication (Authorization Code Flow) is needed for playlist creation.
  // This state now just tracks if the user *attempted* an action requiring Spotify.
  const [spotifyReady, setSpotifyReady] = useState(true); // Assume ready for basic search initially
  const [parsingState, setParsingState] = useState<string | null>(null);
  const [canCreatePlaylist, setCanCreatePlaylist] = useState(false);

  // Placeholder for Spotify Auth - Real auth needed for playlist creation
  // The backend uses Client Credentials, which is server-to-server.
  // If user-specific actions are needed, implement Authorization Code Flow.
  useEffect(() => {
    console.warn('Spotify Authentication: Using backend Client Credentials. Playlist creation requires user authorization (Authorization Code Flow).');
  }, []);

  const handleParseComments = async () => {
    if (!youtubeLink) {
       toast({ title: "Input Missing", description: "Please enter a YouTube URL.", variant: "destructive" });
       return;
    }
    setLoading(true);
    setParsingState("Fetching and parsing comments from YouTube...");
    setSongs([]); // Clear previous songs
    setCanCreatePlaylist(false);
    try {
      // Call the AI flow which now uses the backend /api/youtube route
      const result: ParseYouTubeCommentOutput = await parseYouTubeComment({
        youtubeUrl: youtubeLink,
        prioritizePinnedComments: prioritizePinned
      });
      setSongs(result.songs);
      setParsingState(`Found ${result.songs.length} potential songs.`);
      toast({
        title: "Songs Parsed",
        description: `Successfully parsed ${result.songs.length} songs from the comments.`,
      });
      if (result.songs.length > 0) {
        setCanCreatePlaylist(true); // Enable the "Create Playlist" section
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Parsing Error",
        description: error.message || "Failed to parse comments.",
      });
      setParsingState(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!spotifyUserId) {
      toast({
        variant: "destructive",
        title: "Spotify User ID Required",
        description: "Please enter your Spotify User ID.",
      });
      return;
    }

    if (songs.length === 0) {
      toast({
        variant: "destructive",
        title: "No Songs",
        description: "No songs found to add to the playlist.",
      });
      return;
    }

    setLoading(true);
    setParsingState("Searching for songs on Spotify...");

    try {
      const trackUris: string[] = [];
      for (const song of songs) {
        try {
          const searchQuery = `${song.title} ${song.artist}`;
          const response = await fetch('/api/spotify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'search', query: searchQuery, type: 'track' }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.warn(`Spotify search failed for "${searchQuery}": ${errorData.error?.message || response.statusText}`);
            continue; // Skip this song if search fails
          }

          const data = await response.json();
          const track = data?.tracks?.items?.[0];
          if (track?.uri) {
            trackUris.push(track.uri);
          } else {
             console.warn(`No Spotify track found for "${searchQuery}"`);
          }
        } catch (searchError: any) {
           console.error(`Error searching for song "${song.title}":`, searchError);
        }
      }

       if (trackUris.length === 0) {
           throw new Error("Could not find any of the songs on Spotify.");
       }

      setParsingState(`Found ${trackUris.length} songs on Spotify. Creating playlist...`);

      const playlistName = `YouTube Flow: ${new URL(youtubeLink).searchParams.get('v') || 'Playlist'}`;
      const createResponse = await fetch('/api/spotify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_playlist',
          userId: spotifyUserId,
          playlistName: playlistName,
          trackUris: trackUris,
        }),
      });

      const createData = await createResponse.json();

      if (!createResponse.ok) {
         // Handle specific backend warnings vs errors
         if (createData.warning) {
            toast({
                title: "Playlist Created (with issues)",
                description: createData.warning,
                variant: "default", // Use default variant for warnings
            });
         } else {
            throw new Error(createData.error || `Failed to create playlist (${createResponse.status})`);
         }
      } else {
          toast({
            title: "Playlist Created Successfully",
            description: `Playlist created on Spotify with ${trackUris.length} tracks. ID: ${createData.playlistId}`,
          });
      }

    } catch (error: any) {
      console.error("Playlist Creation Error:", error);
      toast({
        variant: "destructive",
        title: "Playlist Creation Error",
        description: error.message || "An unexpected error occurred.",
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
           {/* Removed Auth Button - Auth is handled backend or needs full user flow */}

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
              />
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="prioritize-pinned"
                  checked={prioritizePinned}
                  onCheckedChange={(checked) => setPrioritizePinned(Boolean(checked))}
                />
                <Label htmlFor="prioritize-pinned" className="text-sm text-muted-foreground">
                  Prioritize Pinned Comments (if available)
                </Label>
              </div>
              <Button
                onClick={handleParseComments}
                disabled={loading || !youtubeLink}
                className="w-full rounded-md"
              >
                {loading && parsingState?.includes('YouTube') ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    {parsingState}
                  </>
                ) : (
                  "Parse YouTube Comments"
                )}
              </Button>
            </div>

            {/* Spotify Playlist Creation Section - Enabled after successful parsing */}
            {canCreatePlaylist && (
            <div className="space-y-2 pt-4 border-t">
               <p className="text-sm text-muted-foreground">
                  Warning: Playlist creation requires Spotify User authorization. The current setup might fail.
                  Please ensure your backend has the necessary permissions if using user-specific actions.
               </p>
              <div className="flex items-center space-x-2">
                {spotifyIcon}
                <Label htmlFor="spotify-user-id">Spotify User ID</Label>
              </div>
              <Input
                id="spotify-user-id"
                type="text"
                placeholder="Enter Your Spotify User ID"
                value={spotifyUserId}
                onChange={(e) => setSpotifyUserId(e.target.value)}
                className="rounded-md"
              />
              <Button
                onClick={handleCreatePlaylist}
                disabled={loading || songs.length === 0 || !spotifyUserId}
                className="w-full rounded-md bg-green-600 text-white hover:bg-green-700"
              >
                {loading && parsingState?.includes('Spotify') ? (
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
                <li key={index} className="text-sm border-b pb-1">
                  {song.title} - <span className="text-muted-foreground">{song.artist}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

