import type { Session } from "next-auth";

/**
 * Type guard to check if a session has an accessToken.
 */
export function hasAccessToken(session: Session | null | undefined): session is Session & { accessToken: string } {
  // We use 'unknown' here because we don't know the exact type of 'session' at this point.
  // The type guard will narrow the type of 'session' if it passes the checks.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return !!session && typeof (session as { accessToken?: unknown }).accessToken === "string";
}
