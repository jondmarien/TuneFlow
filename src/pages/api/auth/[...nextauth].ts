// --- NextAuth.js (Auth.js) API Route for Google OAuth ---
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
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
    async jwt({ token, account }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        if (typeof account.access_token === 'string') {
          token.accessToken = account.access_token;
        }
        if (typeof account.id_token === 'string') {
          token.idToken = account.id_token;
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Send access_token to the client
      (session as { accessToken?: string | undefined }).accessToken = typeof token.accessToken === 'string' ? token.accessToken : undefined;
      (session as { idToken?: string | undefined }).idToken = typeof token.idToken === 'string' ? token.idToken : undefined;
      return session;
    },
  },
};

export default NextAuth(authOptions);
