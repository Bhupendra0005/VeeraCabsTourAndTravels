import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isProd, requireEnv } from "@/lib/server/core/env";

// "__Host-" pins the cookie to this exact host over HTTPS (no Domain, Path=/, Secure).
const COOKIE = isProd ? "__Host-vt_session" : "vt_session";
const TTL_SECONDS = 60 * 60 * 24 * 14;

export type Session = { customerId: string; email: string };

function secret(): string {
  const value = requireEnv("SESSION_SECRET");
  if (value.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
  return value;
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export async function createSession(session: Session) {
  const payload = Buffer.from(
    JSON.stringify({ sub: session.customerId, email: session.email, exp: Math.floor(Date.now() / 1000) + TTL_SECONDS }),
  ).toString("base64url");
  const store = await cookies();
  store.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: string;
      email?: string;
      exp?: number;
    };
    if (!data.sub || !data.email || !data.exp || data.exp < Date.now() / 1000) return null;
    return { customerId: data.sub, email: data.email };
  } catch {
    return null;
  }
}
