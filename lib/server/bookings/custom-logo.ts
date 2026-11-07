import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The owner's own logo for invoices and tickets. Only two sources are trusted: the site's ImageKit library
 * (asked to deliver a PNG) and a .png under /public. Anything else, any failure, and any non-PNG result
 * returns null, so the documents fall back to the built-in logo instead of failing.
 */

const MAX_BYTES = 3 * 1024 * 1024;
const TTL_MS = 10 * 60_000;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const cache = new Map<string, { at: number; png: Buffer | null }>();

function imageKitHost(): string | null {
  try {
    const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
    return endpoint ? new URL(endpoint).host : null;
  } catch {
    return null;
  }
}

async function fetchPng(url: string): Promise<Buffer | null> {
  if (url.startsWith("/")) {
    if (url.startsWith("//") || url.includes("..") || url.includes("\\") || !url.toLowerCase().endsWith(".png")) return null;
    return readFile(path.join(process.cwd(), "public", url));
  }

  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.host !== imageKitHost()) return null;
  // ImageKit converts on the fly; PDFs can only embed PNG or JPEG
  parsed.searchParams.set("tr", "f-png,w-900");
  const response = await fetch(parsed, { signal: AbortSignal.timeout(6000), redirect: "error" });
  if (!response.ok) return null;
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) return null;
  return Buffer.from(await response.arrayBuffer());
}

export async function loadCustomLogo(url: string): Promise<Buffer | null> {
  if (!url) return null;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.png;

  let png: Buffer | null = null;
  try {
    const bytes = await fetchPng(url);
    if (bytes && bytes.length <= MAX_BYTES && bytes.subarray(0, 8).equals(PNG_SIGNATURE)) png = bytes;
  } catch (error) {
    console.error("Custom logo could not be loaded, using the built-in logo", error);
  }

  if (cache.size >= 8) cache.clear();
  cache.set(url, { at: Date.now(), png });
  return png;
}
