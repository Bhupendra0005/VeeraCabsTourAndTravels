"use client";

import { Check, Copy, ExternalLink, FolderOpen, ImagePlus, Loader2, Maximize2, Search, Trash2, UploadCloud, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, inputClass } from "@/components/admin/ui";
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
  const [uploading, setUploading] = useState("");
  const [copied, setCopied] = useState("");
  const [deleting, setDeleting] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<MediaFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDialogElement>(null);

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

  // the big preview is a modal dialog
  useEffect(() => {
    const dialog = previewRef.current;
    if (preview && dialog && !dialog.open) dialog.showModal();
  }, [preview]);

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
    const chosen = Array.from(list).slice(0, 10);
    setUploading(`Uploading 1 of ${chosen.length}...`);
    setError("");
    setNotice("");
    let done = 0;
    try {
      for (const original of chosen) {
        setUploading(`Uploading ${done + 1} of ${chosen.length}...`);
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
      setUploading("");
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
      previewRef.current?.close();
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
  const needle = query.trim().toLowerCase();
  const shown = needle ? files.filter((file) => file.name.toLowerCase().includes(needle)) : files;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      {/* Folders as tabs */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <nav className="-mx-1 flex min-w-0 basis-full gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] max-sm:[mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)] max-sm:pr-8 sm:flex-1 sm:basis-0" aria-label="Folders">
          {FOLDERS.map((f) => {
            const on = folder === f.value;
            return (
              <button
                key={f.value}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  if (on) return;
                  setLoading(true);
                  setError("");
                  setQuery("");
                  setFolder(f.value);
                }}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition [&>svg]:size-4",
                  on ? "border-transparent bg-linear-to-r from-brand to-brand-bright text-white shadow-[0_10px_28px_-10px_rgba(0,150,219,0.85)]" : "border-white/10 bg-white/4 text-white/80 hover:border-white/25 hover:text-white",
                )}
              >
                {f.value === "all" ? <ImagePlus aria-hidden="true" /> : <FolderOpen aria-hidden="true" />} {f.label}
              </button>
            );
          })}
        </nav>
        <span className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-xs font-bold text-white/75">
          {files.length}
          {hasMore ? "+" : ""} {files.length === 1 && !hasMore ? "image" : "images"}
        </span>
      </div>

      {/* Upload: click or drop photos here */}
      <input ref={inputRef} id={`media-upload-${mode}`} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => void upload(e.target.files)} />
      <button
        type="button"
        disabled={Boolean(uploading)}
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
          "flex items-center gap-4 rounded-2xl border-2 border-dashed px-5 text-left transition disabled:cursor-wait max-sm:flex-col max-sm:text-center",
          mode === "pick" ? "py-4" : "py-6",
          dragging ? "border-brand-bright bg-brand/15" : "border-white/15 bg-white/3 hover:border-brand-bright/60 hover:bg-white/5",
        )}
      >
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-brand/25 to-brand/5 text-brand-bright ring-1 ring-brand-bright/25">
          {uploading ? <Loader2 className="size-7 animate-spin" aria-hidden="true" /> : <UploadCloud className="size-7" aria-hidden="true" />}
        </span>
        <span className="grid min-w-0 gap-0.5">
          <span className="font-(family-name:--font-display) text-base font-bold sm:text-lg">{uploading || (dragging ? "Drop to upload" : "Drag photos here, or click to upload")}</span>
          <span className="max-w-xl text-xs text-muted">JPG, PNG or WebP, up to 10 at a time. Large photos are resized automatically. Uploads go to {folderLabel}.</span>
        </span>
      </button>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      {files.length > 8 ? (
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/45" aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by file name..." aria-label="Search images" className={cn(inputClass, "pl-10")} />
        </div>
      ) : null}

      {files.length === 0 && !loading && !error ? (
        <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-white/12 px-6 py-12 text-center">
          <ImagePlus className="size-10 text-white/30" aria-hidden="true" />
          <p className="text-sm text-muted">No images in this folder yet. Upload your first one above.</p>
        </div>
      ) : shown.length === 0 && needle ? (
        <p className="text-sm text-muted">No image name contains &quot;{query}&quot;.</p>
      ) : (
        <ul className={cn("grid gap-4", mode === "pick" ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5")}>
          {shown.map((file) => (
            <li key={file.fileId} className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/3 transition hover:-translate-y-0.5 hover:border-brand-bright/40 hover:shadow-[0_18px_40px_-20px_rgba(0,150,219,0.5)]">
              {/* the whole photo, not a crop; a click opens it large */}
              <button type="button" onClick={() => setPreview(file)} aria-label={`Open ${file.name}`} className="relative block aspect-4/3 w-full bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={file.thumbnailUrl} alt={file.name} loading="lazy" className="size-full object-contain transition duration-300 group-hover:scale-[1.03]" />
                <span className="absolute right-2 bottom-2 grid size-8 place-items-center rounded-lg bg-black/60 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 max-sm:opacity-100">
                  <Maximize2 className="size-4" aria-hidden="true" />
                </span>
              </button>
              <div className="grid flex-1 content-start gap-2 p-3">
                <div className="line-clamp-2 text-[13px] font-semibold wrap-anywhere" title={file.name}>
                  {file.name}
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold text-white/65">
                  {file.width && file.height ? (
                    <span className="rounded-md bg-white/8 px-2 py-0.5">
                      {file.width} × {file.height}
                    </span>
                  ) : null}
                  <span className="rounded-md bg-white/8 px-2 py-0.5">{kb(file.size)}</span>
                </div>
              </div>
              <div className="border-t border-white/10 p-2.5">
                {mode === "pick" ? (
                  <Button size="sm" className="min-h-9 w-full rounded-lg" onClick={() => onPick?.(file.url)}>
                    <Check aria-hidden="true" /> Use this image
                  </Button>
                ) : confirmDelete === file.fileId ? (
                  <div className="grid gap-2 rounded-lg border border-red-400/30 bg-red-400/10 p-2.5">
                    <div className="text-xs text-red-200">Delete permanently? Pages using it will fall back to the default photo.</div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="danger" disabled={deleting === file.fileId} onClick={() => void remove(file)}>
                        {deleting === file.fileId ? "Deleting..." : "Delete"}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setConfirmDelete("")}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" className="min-h-9 flex-1" onClick={() => void copy(file.url)}>
                      {copied === file.url ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />} {copied === file.url ? "Copied" : "Copy link"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(file.fileId)}
                      aria-label={`Delete ${file.name}`}
                      title="Delete"
                      className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/15 text-red-300 transition hover:bg-red-500/15 hover:text-red-200 [&>svg]:size-4"
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                )}
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

      {preview ? (
        <dialog
          ref={previewRef}
          aria-label={preview.name}
          onClose={() => setPreview(null)}
          onClick={(event) => {
            if (event.target === previewRef.current) previewRef.current?.close();
          }}
          className="m-auto flex max-h-[94dvh] w-[calc(100%-1.5rem)] max-w-5xl flex-col overflow-hidden rounded-2xl border border-brand-bright/30 bg-panel p-0 text-(--text) shadow-[0_0_60px_-10px_rgba(0,150,219,0.5)] backdrop:bg-black/80 backdrop:backdrop-blur-sm"
        >
          <div className="flex items-start gap-3 border-b border-white/10 px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <h2 className="font-(family-name:--font-display) text-base font-bold wrap-anywhere">{preview.name}</h2>
              <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold text-white/65">
                {preview.width && preview.height ? (
                  <span className="rounded-md bg-white/8 px-2 py-0.5">
                    {preview.width} × {preview.height}
                  </span>
                ) : null}
                <span className="rounded-md bg-white/8 px-2 py-0.5">{kb(preview.size)}</span>
                {preview.folder ? <span className="rounded-md bg-white/8 px-2 py-0.5">Folder: {preview.folder.replace(/^\/+|\/+$/g, "") || "general"}</span> : null}
              </div>
            </div>
            <button type="button" onClick={() => previewRef.current?.close()} aria-label="Close" className="grid size-9 shrink-0 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="grid min-h-0 flex-1 place-items-center overflow-auto bg-black/50 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.url} alt={preview.name} className="max-h-[68dvh] w-auto max-w-full object-contain" />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 bg-black/20 px-5 py-3.5">
            <Button variant="secondary" onClick={() => void copy(preview.url)}>
              {copied === preview.url ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />} {copied === preview.url ? "Link copied" : "Copy link"}
            </Button>
            <a
              href={preview.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold leading-tight transition hover:bg-white/10 [&>svg]:size-4"
            >
              <ExternalLink aria-hidden="true" /> Open original
            </a>
            {mode === "pick" ? (
              <Button
                onClick={() => {
                  onPick?.(preview.url);
                  previewRef.current?.close();
                }}
              >
                <Check aria-hidden="true" /> Use this image
              </Button>
            ) : (
              <Button variant="danger" disabled={deleting === preview.fileId} onClick={() => void remove(preview)}>
                <Trash2 aria-hidden="true" /> {deleting === preview.fileId ? "Deleting..." : "Delete"}
              </Button>
            )}
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
