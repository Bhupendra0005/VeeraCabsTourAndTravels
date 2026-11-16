"use client";

import { UserRoundPlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { DriverForm } from "@/components/admin/driver-form";
import { Button } from "@/components/admin/ui";

/** "Add driver" button. The form opens in a popup only when the button is clicked. */
export function AddDriverButton() {
  const ref = useRef<HTMLDialogElement>(null);
  // changing the key gives a fresh, empty form the next time the popup opens
  const [round, setRound] = useState(0);

  const close = () => {
    ref.current?.close();
    setRound((n) => n + 1);
  };

  return (
    <>
      <Button onClick={() => ref.current?.showModal()}>
        <UserRoundPlus aria-hidden="true" /> Add driver
      </Button>
      <dialog
        ref={ref}
        aria-labelledby="add-driver-title"
        onClick={(e) => {
          // a click on the dark backdrop (the dialog element itself) closes it
          if (e.target === ref.current) close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-2xl border border-brand-bright/30 bg-panel p-0 text-(--text) shadow-[0_0_60px_-10px_rgba(0,150,219,0.5)] backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-start gap-3 border-b border-white/10 p-5 sm:px-6">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-bright ring-1 ring-brand-bright/20">
            <UserRoundPlus className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="add-driver-title" className="font-(family-name:--font-display) text-lg font-bold">
              Add a driver
            </h2>
            <p className="text-sm text-muted">Save a driver once, then pick them from a dropdown on every booking.</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-5 sm:p-6">
          <DriverForm key={round} onDone={close} />
        </div>
      </dialog>
    </>
  );
}
