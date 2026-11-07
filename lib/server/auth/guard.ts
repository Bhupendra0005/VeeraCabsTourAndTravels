import "server-only";
import { HttpError } from "@/lib/server/core/http";
import { getSession, type Session } from "@/lib/server/auth/session";

/** Every mutating or private endpoint starts here. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new HttpError(401, "Please log in to continue.");
  return session;
}
