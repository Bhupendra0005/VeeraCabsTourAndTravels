import { adminApi, audit } from "@/lib/server/admin/api";
import { HttpError, json } from "@/lib/server/core/http";
import {
  MAX_UPLOAD_BYTES,
  MEDIA_FOLDERS,
  deleteMedia,
  listMedia,
  sniffImage,
  uploadMedia,
  type MediaFolder,
} from "@/lib/server/media/imagekit";

export const runtime = "nodejs";

function folderParam(value: string | null): MediaFolder {
  return (MEDIA_FOLDERS as readonly string[]).includes(value ?? "") ? (value as MediaFolder) : "general";
}

/** List the media library (newest first). */
export function GET(request: Request) {
  return adminApi(request, "media.manage", async () => {
    const params = new URL(request.url).searchParams;
    const folderRaw = params.get("folder");
    const folder = folderRaw === "all" || !folderRaw ? "all" : folderParam(folderRaw);
    const skip = Math.max(0, Math.min(100_000, Number.parseInt(params.get("skip") ?? "0", 10) || 0));
    return json(await listMedia(folder, skip));
  });
}

/** Upload one image: checked for size and real file type before it is sent to ImageKit. */
export function POST(request: Request) {
  return adminApi(request, "media.manage", async (admin) => {
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > MAX_UPLOAD_BYTES + 64 * 1024) throw new HttpError(413, "That image is too large. Please use one under 4 MB.");

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "Choose an image to upload.");
    if (file.size === 0) throw new HttpError(400, "That file is empty.");
    if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, "That image is too large. Please use one under 4 MB.");

    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = sniffImage(bytes);
    if (!kind) throw new HttpError(415, "Only JPG, PNG or WebP images are allowed.");

    const base = file.name.replace(/\.[^.]*$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "image";
    const folder = folderParam(String(form.get("folder") ?? ""));
    const uploaded = await uploadMedia({ bytes, fileName: `${base}.${kind.ext}`, folder, mime: kind.mime });
    await audit(admin, "media.uploaded", { entity: "media", entityId: uploaded.fileId, meta: { name: uploaded.name, folder } });
    return json(uploaded, 201);
  });
}

/** Delete one image from the media library. */
export function DELETE(request: Request) {
  return adminApi(request, "media.manage", async (admin) => {
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!/^[a-f0-9]{24}$/i.test(id)) throw new HttpError(400, "Invalid file.");
    await deleteMedia(id);
    await audit(admin, "media.deleted", { entity: "media", entityId: id });
    return json({ ok: true });
  });
}
