import "server-only";
import { isProd } from "@/lib/server/core/env";
import { HttpError } from "@/lib/server/core/http";

/** Verifies a Cloudflare Turnstile token. Fails closed in production if not configured. */
export async function verifyCaptcha(token: unknown, ip?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (isProd) throw new HttpError(503, "Login is not available right now. Please contact us.");
    return; // local development without keys
  }
  if (typeof token !== "string" || token.length < 10 || token.length > 4096) {
    throw new HttpError(400, "Please complete the captcha.");
  }
  try {
    const form = new URLSearchParams({ secret, response: token });
    if (ip) form.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: boolean };
    if (data.success) return;
  } catch (error) {
    console.error("Turnstile verification failed", error);
    throw new HttpError(503, "Captcha check failed. Please try again.");
  }
  throw new HttpError(400, "Captcha check failed. Please try again.");
}
