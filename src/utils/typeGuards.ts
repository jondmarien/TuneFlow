import type { Session } from "next-auth";

/**
 * Type guard to check if a session has an accessToken.
 */
export function hasAccessToken(session: Session | null | undefined): session is Session & { accessToken: string } {
  return !!session && typeof (session as any).accessToken === "string";
}
