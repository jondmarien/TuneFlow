// --- NextAuth.js (Auth.js) API Route for Google OAuth ---
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import SpotifyProvider from "next-auth/providers/spotify";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/youtube.force-ssl",
          ].join(" "),
          include_granted_scopes: "true",
          prompt: "consent", // optional, for always showing the consent screen
        },
      },
    }),
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "user-read-email",
            "playlist-modify-public",
            "playlist-modify-private",
            "user-library-read",
            "user-read-private",
          ].join(" "),
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax", // Use "none" if you ever need true cross-site
        path: "/",
        secure: true,
        domain: ".chron0.tech", // Support all subdomains
      },
    },
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        if (account.provider === 'google') {
          token.youtubeAccessToken = account.access_token;
          token.youtubeIdToken = account.id_token;
        }
        if (account.provider === 'spotify') {
          token.spotifyAccessToken = account.access_token;
          token.spotifyRefreshToken = account.refresh_token;
          token.spotifyExpiresAt = account.expires_at;
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Send provider-specific tokens to the client
      if (token.youtubeAccessToken) {
        (session as any).youtube = {
          accessToken: token.youtubeAccessToken,
          idToken: token.youtubeIdToken,
        };
      }
      if (token.spotifyAccessToken) {
        (session as any).spotify = {
          accessToken: token.spotifyAccessToken,
          refreshToken: token.spotifyRefreshToken,
          expiresAt: token.spotifyExpiresAt,
        };
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
