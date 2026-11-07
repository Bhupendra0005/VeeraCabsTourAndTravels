"use client";

import { Check, Copy, FolderOpen, ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SelectMenu } from "@/components/admin/pickers";
import { Alert, Button } from "@/components/admin/ui";
import { prepareImage } from "@/lib/admin/prepare-image";
import { cn } from "@/lib/utils/cn";

type MediaFile = {
  fileId: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  size: number;
  width: number;
  height: number;
  folder: string;
};

const FOLDERS = [
  { value: "all", label: "All images" },
  { value: "general", label: "General" },
  { value: "hero", label: "Hero" },
  { value: "fleet", label: "Fleet" },
  { value: "destinations", label: "Destinations" },
  { value: "areas", label: "Areas" },
  { value: "services", label: "Services" },
];

const kb = (bytes: number) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

async function api<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { credentials: "same-origin", ...init });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

/**
 * The media library. In "manage" mode it is a full page tool; in "pick" mode it is used inside the
 * image chooser and calls `onPick` with the chosen image URL.
 */
export function MediaLibrary({ mode, onPick, initialFolder = "all" }: { mode: "manage" | "pick"; onPick?: (url: string) => void; initialFolder?: string }) {
  const [folder, setFolder] = useState(initialFolder);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState("");
  const [deleting, setDeleting] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // first page for the chosen folder (state is only set after the request returns)
  useEffect(() => {
    let cancelled = false;
    api<{ files: MediaFile[]; hasMore: boolean }>(`/api/admin/media?folder=${folder}&skip=0`)
      .then((data) => {
        if (cancelled) return;
        setFiles(data.files);
        setHasMore(data.hasMore);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [folder]);

  const loadMore = async () => {
    setLoading(true);
    try {
      const data = await api<{ files: MediaFile[]; hasMore: boolean }>(`/api/admin/media?folder=${folder}&skip=${files.length}`);
      setFiles((current) => [...current, ...data.files]);
      setHasMore(data.hasMore);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const upload = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setUploading(true);
    setError("");
    setNotice("");
    let done = 0;
    try {
      for (const original of Array.from(list).slice(0, 10)) {
        const file = await prepareImage(original);
        const form = new FormData();
        form.set("file", file);
        form.set("folder", folder === "all" ? "general" : folder);
        const uploaded = await api<MediaFile>("/api/admin/media", { method: "POST", body: form });
        setFiles((current) => [uploaded, ...current]);
        done += 1;
      }
      setNotice(`${done} image${done === 1 ? "" : "s"} uploaded.`);
    } catch (e) {
      setError(`${(e as Error).message}${done ? ` (${done} uploaded before the error.)` : ""}`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (file: MediaFile) => {
    setDeleting(file.fileId);
    setError("");
    try {
      await api(`/api/admin/media?id=${file.fileId}`, { method: "DELETE" });
      setFiles((current) => current.filter((item) => item.fileId !== file.fileId));
      setConfirmDelete("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting("");
    }
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setError("Could not copy automatically. Open the image and copy its address.");
    }
  };

  const folderLabel = FOLDERS.find((f) => f.value === (folder === "all" ? "general" : folder))?.label;
  const iconBtn =
    "grid size-9 place-items-center rounded-lg bg-black/65 text-white backdrop-blur transition hover:bg-brand disabled:opacity-60 [&>svg]:size-4";

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1.5">
          <label htmlFor={`media-folder-${mode}`} className="text-[13px] font-semibold">
            Folder
          </label>
          <SelectMenu
            id={`media-folder-${mode}`}
            value={folder}
            size="lg"
            icon={<FolderOpen />}
            onChange={(next) => {
              setLoading(true);
              setError("");
              setFolder(next);
            }}
            className="min-w-52"
            options={FOLDERS.map((f) => ({ value: f.value, label: f.label }))}
          />
        </div>
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-xs font-bold text-white/75">
          {files.length}
          {hasMore ? "+" : ""} {files.length === 1 && !hasMore ? "image" : "images"}
        </p>
      </div>

      {/* Upload: click or drop photos here */}
      <input ref={inputRef} id={`media-upload-${mode}`} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => void upload(e.target.files)} />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void upload(event.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 text-center transition disabled:cursor-wait",
          mode === "pick" ? "py-6" : "py-10",
          dragging ? "border-brand-bright bg-brand/15" : "border-white/15 bg-white/3 hover:border-brand-bright/60 hover:bg-white/5",
        )}
      >
        <span className="grid size-14 place-items-center rounded-2xl bg-linear-to-br from-brand/25 to-brand/5 text-brand-bright ring-1 ring-brand-bright/25">
          {uploading ? <Loader2 className="size-7 animate-spin" aria-hidden="true" /> : <UploadCloud className="size-7" aria-hidden="true" />}
        </span>
        <span className="font-(family-name:--font-display) text-lg font-bold">{uploading ? "Uploading..." : dragging ? "Drop to upload" : "Drag photos here, or click to upload"}</span>
        <span className="max-w-md text-xs text-muted">
          JPG, PNG or WebP, up to 10 at a time. Large photos are resized automatically. Uploads go to {folderLabel}.
        </span>
      </button>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      {files.length === 0 && !loading && !error ? (
        <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-white/12 px-6 py-12 text-center">
          <ImagePlus className="size-10 text-white/30" aria-hidden="true" />
          <p className="text-sm text-muted">No images in this folder yet. Upload your first one above.</p>
        </div>
      ) : (
        <ul className={cn("grid gap-4", mode === "pick" ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5")}>
          {files.map((file) => (
            <li key={file.fileId} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/3 transition hover:-translate-y-0.5 hover:border-brand-bright/40 hover:shadow-[0_18px_40px_-20px_rgba(0,150,219,0.5)]">
              <div className="relative aspect-4/3 bg-black/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={file.thumbnailUrl} alt={file.name} loading="lazy" className="size-full object-cover transition duration-300 group-hover:scale-105" />
                {mode === "manage" && confirmDelete !== file.fileId ? (
                  <div className="absolute right-2 top-2 flex gap-1.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    <button type="button" className={iconBtn} onClick={() => void copy(file.url)} aria-label={`Copy link for ${file.name}`} title="Copy link">
                      {copied === file.url ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                    </button>
                    <button type="button" className={cn(iconBtn, "hover:bg-red-600")} onClick={() => setConfirmDelete(file.fileId)} aria-label={`Delete ${file.name}`} title="Delete">
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="grid gap-2 p-3">
                <p className="text-[13px] font-semibold [overflow-wrap:anywhere]">{file.name}</p>
                <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold text-white/65">
                  {file.width && file.height ? <span className="rounded-md bg-white/8 px-2 py-0.5">{file.width} × {file.height}</span> : null}
                  <span className="rounded-md bg-white/8 px-2 py-0.5">{kb(file.size)}</span>
                  {copied === file.url ? <span className="rounded-md bg-emerald-400/15 px-2 py-0.5 text-emerald-300">Link copied</span> : null}
                </div>
                {mode === "pick" ? (
                  <Button size="sm" className="rounded-lg" onClick={() => onPick?.(file.url)}>
                    <Check aria-hidden="true" /> Use this image
                  </Button>
                ) : confirmDelete === file.fileId ? (
                  <div className="grid gap-2 rounded-lg border border-red-400/30 bg-red-400/10 p-2.5">
                    <p className="text-xs text-red-200">Delete permanently? Pages using it will fall back to the default photo.</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="danger" disabled={deleting === file.fileId} onClick={() => void remove(file)}>
                        {deleting === file.fileId ? "Deleting..." : "Delete"}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setConfirmDelete("")}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3">
        {loading ? <Loader2 className="size-5 animate-spin text-muted" aria-label="Loading" /> : null}
        {hasMore && !loading ? (
          <Button variant="secondary" className="rounded-xl" onClick={() => void loadMore()}>
            Load more
          </Button>
        ) : null}
      </div>
    </div>
  );
}
