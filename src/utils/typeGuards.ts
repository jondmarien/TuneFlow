import type { Session } from "next-auth";

/**
 * Type guard to check if a session has an accessToken for a given provider.
 * Supports both YouTube (Google) and Spotify integrations.
 */
export function hasAccessToken(session: any, provider?: 'spotify' | 'youtube'): boolean {
  if (!session) return false;
  // If using NextAuth with multiple providers, tokens may be under session.provider or session[provider]
  if (provider === 'spotify') {
    // Try several possible shapes
    if (session.spotify?.accessToken) return true;
    if (session.accessToken && session.provider === 'spotify') return true;
    if (session.user?.spotifyAccessToken) return true;
    // Add more shapes as needed
    return false;
  }
  if (provider === 'youtube') {
    if (session.youtube?.accessToken) return true;
    if (session.accessToken && session.provider === 'google') return true;
    if (session.user?.youtubeAccessToken) return true;
    return false;
  }
  // Fallback: any accessToken
  return !!session.accessToken;
}
