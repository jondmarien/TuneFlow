import SpotifyWebApi from 'spotify-web-api-node';

// Initialize the Spotify API client
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

// Cache for access tokens
let accessToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get or refresh the Spotify access token
 */
async function getAccessToken(): Promise<string> {
  if (accessToken && tokenExpiry > Date.now()) {
    return accessToken;
  }

  try {
    const data = await spotifyApi.clientCredentialsGrant();
    // (Removed: Do not log raw Spotify client credentials response or access token)
    accessToken = data.body.access_token;
    tokenExpiry = Date.now() + (data.body.expires_in * 1000);
    spotifyApi.setAccessToken(accessToken);
    return accessToken;
  } catch (error) {
    console.error('Error getting Spotify access token:', error);
    throw error;
  }
}

/**
 * Search for a track on Spotify and return its album art URL
 */
export async function getTrackAlbumArt(title: string, artist: string): Promise<string | null> {
  try {
    await getAccessToken();

    // Format the search query with proper escaping
    const query = `${encodeURIComponent(title)} ${encodeURIComponent(artist)}`;
    console.log(`[getTrackAlbumArt] Searching for: ${query}`);

    // Explicitly type the response as SpotifyApi.SearchResponse
    const searchResults = await spotifyApi.searchTracks(query, {
      limit: 1,
    }) as unknown as { body: SpotifyApi.SearchResponse };

    // Check if we got any results
    if (!searchResults.body?.tracks?.items?.length) {
      console.log(`[getTrackAlbumArt] No results found for ${query}`);
      return null;
    }

    const track = searchResults.body.tracks.items[0];
    
    // Check if we have album images
    if (!track.album?.images?.length) {
      console.log(`[getTrackAlbumArt] No album images found for track: ${track.name} by ${track.artists[0].name}`);
      return null;
    }

    // Return the largest available image
    const largestImage = track.album.images[0];
    console.log(`[getTrackAlbumArt] Found album art for ${track.name} by ${track.artists[0].name}: ${largestImage.url}`);
    return largestImage.url;

  } catch (error) {
    if (error instanceof Error) {
      console.error(`[getTrackAlbumArt] Error searching for track ${title} by ${artist}:`, error.message);
      return null;
    }
    console.error(`[getTrackAlbumArt] Unexpected error searching for track ${title} by ${artist}:`, error);
    return null;
  }
}

// Export getAccessToken for API routes
export { getAccessToken };
