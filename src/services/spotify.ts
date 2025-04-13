/**
 * Represents a song with a title and artist.
 */
export interface Song {
  /**
   * The title of the song.
   */
  title: string;
  /**
   * The artist of the song.
   */
  artist: string;
}

/**
 * Authenticates with Spotify.
 */
export async function authenticateSpotify(clientId: string, clientSecret: string): Promise<string> {
  console.log('Authenticating with Spotify...');

  if (!clientId || !clientSecret) {
    throw new Error('Spotify client ID and secret must be set in environment variables.');
  }

  const authUrl = 'https://accounts.spotify.com/api/token';
  const authBody = new URLSearchParams({
    grant_type: 'client_credentials',
  });

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: authBody,
    });

    if (!response.ok) {
      throw new Error(`Spotify authentication failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error: any) {
    throw new Error(`Failed to authenticate with Spotify: ${error.message}`);
  }
}

/**
 * Searches for a song on Spotify.
 *
 * @param song The song to search for.
 * @returns A promise that resolves to a Spotify track ID.
 */
export async function searchSong(song: Song, accessToken: string): Promise<string> {
  console.log(`Searching for song on Spotify: ${song.title} - ${song.artist}`);

  const searchUrl = `https://api.spotify.com/v1/search?q=track:${encodeURIComponent(song.title)}%20artist:${encodeURIComponent(song.artist)}&type=track`;

  try {
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Spotify song search failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.tracks.items.length > 0) {
      // Return the URI of the first track found
      return data.tracks.items[0].uri;
    } else {
      return ""; // Or throw an error if you prefer
    }
  } catch (error: any) {
    throw new Error(`Failed to search for song on Spotify: ${error.message}`);
  }
}

/**
 * Creates a playlist on Spotify.
 *
 * @param accessToken The access token for the Spotify API.
 * @param playlistName The name of the playlist to create.
 * @param trackIds The track IDs of the songs to add to the playlist.
 * @returns A promise that resolves to the ID of the created playlist.
 */
export async function createPlaylist(
  userId: string,
  accessToken: string,
  playlistName: string,
  trackIds: string[]
): Promise<string> {
  console.log(`Creating playlist for user ${userId} with tracks: ${trackIds.join(', ')}...`);

  try {
    // 1. Create the playlist
    const createPlaylistUrl = `https://api.spotify.com/v1/users/${userId}/playlists`;
    const createPlaylistResponse = await fetch(createPlaylistUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: playlistName,
        public: false, // Or true, depending on whether you want the playlist to be public
        description: 'Playlist created by AI',
      }),
    });

    if (!createPlaylistResponse.ok) {
      throw new Error(`Failed to create playlist: ${createPlaylistResponse.statusText}`);
    }

    const createPlaylistData = await createPlaylistResponse.json();
    const playlistId = createPlaylistData.id;

    // 2. Add tracks to the playlist (if trackIds is not empty)
    if (trackIds.length > 0) {
      const addTracksUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
      const addTracksResponse = await fetch(addTracksUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: trackIds,
        }),
      });

      if (!addTracksResponse.ok) {
        throw new Error(`Failed to add tracks to playlist: ${addTracksResponse.statusText}`);
      }
    }
    return playlistId;
  } catch (error: any) {
    throw new Error(`Failed to create Spotify playlist: ${error.message}`);
  }
}
