import "server-only";
import { requireEnv } from "@/lib/server/core/env";

/**
 * ImageKit access for the admin media library. The private key stays on the server: the browser sends
 * files to our own API, which checks the admin and the file before forwarding it.
 */

const API = "https://api.imagekit.io/v1";
const UPLOAD = "https://upload.imagekit.io/api/v1/files/upload";

/** Everything the site uploads lives under this folder; nothing outside it can be listed or deleted. */
export const MEDIA_ROOT = "/veera-cabs";
export const MEDIA_FOLDERS = ["general", "hero", "fleet", "destinations", "areas", "services"] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export type MediaFile = {
  fileId: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  size: number;
  width: number;
  height: number;
  folder: string;
  createdAt: string;
};

type RawFile = {
  fileId: string;
  name: string;
  url: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  size: number;
  width?: number;
  height?: number;
  filePath: string;
  createdAt: string;
  type?: string;
};

function authHeader() {
  return `Basic ${Buffer.from(`${requireEnv("IMAGEKIT_PRIVATE_KEY")}:`).toString("base64")}`;
}

function shape(file: RawFile): MediaFile {
  return {
    fileId: file.fileId,
    name: file.name,
    url: file.url,
    thumbnailUrl: file.thumbnailUrl ?? file.thumbnail ?? `${file.url}?tr=w-240,h-240,c-at_max`,
    size: file.size,
    width: file.width ?? 0,
    height: file.height ?? 0,
    folder: file.filePath.replace(`${MEDIA_ROOT}/`, "").split("/")[0] ?? "general",
    createdAt: file.createdAt,
  };
}

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { authorization: authHeader(), accept: "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status === 204) return undefined as T;
  const data = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) {
    console.error("ImageKit error", response.status, (data as { message?: string }).message);
    throw new Error("The media service returned an error.");
  }
  return data;
}

export async function listMedia(folder: MediaFolder | "all", skip: number, limit = 48) {
  const path = folder === "all" ? MEDIA_ROOT : `${MEDIA_ROOT}/${folder}`;
  const query = new URLSearchParams({
    path,
    type: "file",
    fileType: "image",
    sort: "DESC_CREATED",
    skip: String(skip),
    limit: String(limit),
  });
  const files = await call<RawFile[]>(`${API}/files?${query.toString()}`);
  return { files: files.map(shape), hasMore: files.length === limit };
}

export async function uploadMedia(opts: { bytes: Uint8Array; fileName: string; folder: MediaFolder; mime: string }) {
  const form = new FormData();
  form.set("file", new Blob([Buffer.from(opts.bytes)], { type: opts.mime }), opts.fileName);
  form.set("fileName", opts.fileName);
  form.set("folder", `${MEDIA_ROOT}/${opts.folder}`);
  form.set("useUniqueFileName", "true");
  return shape(await call<RawFile>(UPLOAD, { method: "POST", body: form }));
}

const FILE_ID = /^[a-f0-9]{24}$/i;

export async function deleteMedia(fileId: string) {
  if (!FILE_ID.test(fileId)) throw new Error("Invalid file id");
  // never delete anything outside our own folder, whatever id is sent
  const details = await call<RawFile>(`${API}/files/${fileId}/details`);
  if (!details.filePath.startsWith(`${MEDIA_ROOT}/`)) throw new Error("File is outside the media folder");
  await call<void>(`${API}/files/${fileId}`, { method: "DELETE" });
}

/** Detects the real image type from the file's first bytes; the browser-reported type is never trusted. */
export function sniffImage(bytes: Uint8Array): { mime: string; ext: string } | null {
  if (bytes.length > 12) {
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { mime: "image/png", ext: "png" };
    const riff = String.fromCharCode(...bytes.slice(0, 4));
    const webp = String.fromCharCode(...bytes.slice(8, 12));
    if (riff === "RIFF" && webp === "WEBP") return { mime: "image/webp", ext: "webp" };
  }
  return null;
}
