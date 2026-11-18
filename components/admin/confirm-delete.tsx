"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Alert, Button } from "@/components/admin/ui";
import type { ActionState } from "@/lib/admin/action-state";

/** Delete button with a confirmation popup. `action` is a server action that deletes the row with this id. */
export function ConfirmDelete({ id, action, what, summary, compact, redirectTo }: { id: string; action: (id: string) => Promise<ActionState>; what: string; summary: string; compact?: boolean; redirectTo?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pending]);

  const confirm = () =>
    startTransition(async () => {
      const result = await action(id);
      if (result.ok) {
        setOpen(false);
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      } else {
        setError(result.error ?? "Could not delete.");
      }
    });

  return (
    <>
      <Button variant="danger" size="sm" className={compact ? "w-full" : undefined} onClick={() => { setError(""); setOpen(true); }}>
        <Trash2 aria-hidden="true" /> Delete
      </Button>
      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-80 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !pending) setOpen(false);
              }}
            >
              <div role="alertdialog" aria-modal="true" aria-label={`Delete ${what}`} className="grid w-full max-w-sm gap-4 rounded-2xl border border-red-400/30 bg-[#0c1a24] p-5 text-left shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-400/15 text-red-300">
                    <Trash2 className="size-5" aria-hidden="true" />
                  </span>
                  <h2 className="font-(family-name:--font-display) text-lg font-bold">Delete this {what}?</h2>
                </div>
                <p className="text-sm text-muted wrap-anywhere">
                  <b className="text-(--text)">{summary}</b> will be removed permanently. This cannot be undone.
                </p>
                {error ? <Alert tone="danger">{error}</Alert> : null}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="danger" disabled={pending} onClick={confirm}>
                    {pending ? "Deleting..." : "Yes, delete"}
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
