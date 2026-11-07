import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/server/core/db";
import { requireEnv } from "@/lib/server/core/env";
import { HttpError } from "@/lib/server/core/http";
import { sendEmail } from "@/lib/server/email/brevo";
import { getSite } from "@/lib/server/cms/content";
import { otpEmail } from "@/lib/server/email/templates";

const OTP_TTL_MS = 10 * 60_000;
const RESEND_COOLDOWN_MS = 45_000;
const MAX_PER_EMAIL_PER_HOUR = 5;
const MAX_PER_IP_PER_HOUR = 15;
const MAX_ATTEMPTS = 5;

/** HMAC (not a bare hash): a leaked table cannot be brute-forced offline without the server secret. */
function hashCode(email: string, code: string): string {
  return createHmac("sha256", requireEnv("SESSION_SECRET")).update(`otp:${email}:${code}`).digest("hex");
}

export type Customer = { id: string; email: string };

/**
 * Creates and emails a one-time code. The caller responds identically whether or not
 * the address is known, so this cannot be used to discover registered emails.
 */
export async function requestOtp(email: string, ipHash: string | undefined) {
  const since = new Date(Date.now() - 60 * 60_000).toISOString();

  const { data: recent, error } = await db()
    .from("login_otps")
    .select("created_at")
    .eq("email", email)
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  if (error) throw error;

  if (recent.length >= MAX_PER_EMAIL_PER_HOUR) {
    throw new HttpError(429, "Too many codes requested. Please try again in an hour.");
  }
  if (recent[0] && Date.now() - new Date(recent[0].created_at).getTime() < RESEND_COOLDOWN_MS) {
    throw new HttpError(429, "Please wait a few seconds before requesting another code.");
  }

  if (ipHash) {
    const { count, error: ipError } = await db()
      .from("login_otps")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);
    if (ipError) throw ipError;
    if ((count ?? 0) >= MAX_PER_IP_PER_HOUR) {
      throw new HttpError(429, "Too many requests. Please try again later.");
    }
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { error: insertError } = await db().from("login_otps").insert({
    email,
    code_hash: hashCode(email, code),
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    ip_hash: ipHash ?? null,
  });
  if (insertError) throw insertError;

  await sendEmail({ to: email, ...otpEmail(await getSite(), code) });
}

/** Checks a code (single use, 5 attempts) and returns the customer, creating it on first login. */
export async function verifyOtp(email: string, code: string): Promise<Customer> {
  const invalid = new HttpError(400, "That code is incorrect or has expired.");

  const { data: row, error } = await db()
    .from("login_otps")
    .select("id, code_hash, attempts")
    .eq("email", email)
    .eq("consumed", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!row || row.attempts >= MAX_ATTEMPTS) throw invalid;

  const expected = Buffer.from(row.code_hash);
  const given = Buffer.from(hashCode(email, code));
  const match = expected.length === given.length && timingSafeEqual(expected, given);

  if (!match) {
    await db().from("login_otps").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    throw invalid;
  }

  // single use: only one concurrent request can flip consumed from false to true
  const { data: claimed, error: claimError } = await db()
    .from("login_otps")
    .update({ consumed: true })
    .eq("id", row.id)
    .eq("consumed", false)
    .select("id");
  if (claimError) throw claimError;
  if (!claimed?.length) throw invalid;

  const { data: customer, error: customerError } = await db()
    .from("customers")
    .upsert({ email }, { onConflict: "email" })
    .select("id, email")
    .single();
  if (customerError) throw customerError;
  return customer;
}

export function hashIp(ip: string | undefined): string | undefined {
  if (!ip) return undefined;
  return createHmac("sha256", requireEnv("SESSION_SECRET")).update(`ip:${ip}`).digest("hex").slice(0, 32);
}
