import "server-only";
import { NextResponse } from "next/server";
import { ConfigError } from "@/lib/server/core/env";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const NO_STORE = { "Cache-Control": "no-store" };

/** JSON response that must never be cached (auth, bookings, payments). */
export function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/** Rejects cross-site POSTs (cookie sessions + SameSite=Lax is the first line, this is the second). */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let ok = false;
  try {
    ok = !!origin && !!host && new URL(origin).host === host;
  } catch {
    ok = false;
  }
  if (!ok) throw new HttpError(403, "Request blocked.");
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 20_000) throw new HttpError(413, "Request too large.");
  try {
    const body = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {
    /* fall through */
  }
  throw new HttpError(400, "Invalid request.");
}

/** Wraps a route handler so failures never crash or leak internals. */
export function handle(fn: () => Promise<Response>): Promise<Response> {
  return fn().catch((error: unknown) => {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    if (error instanceof ConfigError) {
      console.error(error.message);
      return json({ error: "This feature is not available right now. Please contact us." }, 503);
    }
    console.error("Unhandled route error", error);
    return json({ error: "Something went wrong. Please try again." }, 500);
  });
}

export function clientIp(request: Request): string | undefined {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
}
