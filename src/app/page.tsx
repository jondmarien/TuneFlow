"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Song } from "@/services/spotify";
import { authenticateSpotify, searchSong, createPlaylist } from "@/services/spotify";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import { parseYouTubeComment } from "@/ai/flows/parse-youtube-comment";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
  const { toast } = useToast();

  const handleParseComments = async () => {
    setLoading(true);
    try {
      const result = await parseYouTubeComment({ youtubeUrl: youtubeLink, prioritizePinnedComments: prioritizePinned });
      setSongs(result.songs);
      toast({
        title: "Songs Parsed",
        description: `Successfully parsed ${result.songs.length} songs from the comments.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Parsing Error",
        description: error.message || "Failed to parse comments.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!spotifyUserId) {
      toast({
        variant: "destructive",
        title: "Spotify Error",
        description: "Please enter your Spotify User ID.",
      });
      return;
    }

    if (songs.length === 0) {
      toast({
        variant: "destructive",
        title: "Playlist Error",
        description: "No songs to add to the playlist.",
      });
      return;
    }

    setLoading(true);
    try {
      await authenticateSpotify();
      const trackIds = await Promise.all(songs.map(async (song) => {
        const trackId = await searchSong(song);
        return trackId;
      }));

      const playlistId = await createPlaylist(spotifyUserId, "TuneFlow Playlist", trackIds);

      toast({
        title: "Playlist Created",
        description: `Playlist successfully created with ID: ${playlistId}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Playlist Creation Error",
        description: error.message || "Failed to create playlist.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 bg-background text-foreground">
      <Card className="w-full max-w-md p-4 rounded-lg shadow-md bg-secondary">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">TuneFlow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            {youtubeIcon}
            <Label htmlFor="youtube-link">YouTube Link</Label>
          </div>
          <Input
            id="youtube-link"
            type="url"
            placeholder="Enter YouTube Video or Comment URL"
            value={youtubeLink}
            onChange={(e) => setYoutubeLink(e.target.value)}
            className="rounded-md"
          />
          <div className="flex items-center space-x-2">
            <Checkbox
              id="prioritize-pinned"
              checked={prioritizePinned}
              onCheckedChange={(checked) => setPrioritizePinned(checked || false)}
            />
            <Label htmlFor="prioritize-pinned" className="text-sm">
              Prioritize Pinned Comments
            </Label>
          </div>
          <Button
            onClick={handleParseComments}
            disabled={loading}
            className="w-full rounded-md"
          >
            {loading ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                Parsing Comments...
              </>
            ) : (
              "Parse Comments"
            )}
          </Button>

          <div className="flex items-center space-x-2">
            {spotifyIcon}
            <Label htmlFor="spotify-user-id">Spotify User ID</Label>
          </div>
          <Input
            id="spotify-user-id"
            type="text"
            placeholder="Enter Spotify User ID"
            value={spotifyUserId}
            onChange={(e) => setSpotifyUserId(e.target.value)}
            className="rounded-md"
          />
          <Button
            onClick={handleCreatePlaylist}
            disabled={loading || songs.length === 0}
            className="w-full rounded-md bg-accent text-foreground hover:bg-accent-foreground hover:text-background"
          >
            {loading ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                Creating Playlist...
              </>
            ) : (
              "Create Spotify Playlist"
            )}
          </Button>
        </CardContent>
      </Card>

      {songs.length > 0 && (
        <Card className="w-full max-w-md mt-4 p-4 rounded-lg shadow-md bg-secondary">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Parsed Songs</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {songs.map((song, index) => (
                <li key={index} className="text-sm">
                  {song.title} - {song.artist}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
