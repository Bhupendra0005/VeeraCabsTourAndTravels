"use client";

import { Pencil, X } from "lucide-react";
import { useRef } from "react";
import { DriverActiveButton, DriverForm } from "@/components/admin/driver-form";
import { Button } from "@/components/admin/ui";

type Driver = { id: string; name: string; phone: string; cabNumber: string; cabModel: string; note: string; active: boolean };

/** "Edit" button for the driver profile. The form opens in a popup and closes itself once saved. */
export function EditDriverButton({ driver }: { driver: Driver }) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();

  return (
    <>
      <Button variant="secondary" onClick={() => ref.current?.showModal()}>
        <Pencil aria-hidden="true" /> Edit
      </Button>
      <dialog
        ref={ref}
        aria-labelledby="edit-driver-title"
        onClick={(e) => {
          // a click on the dark backdrop (the dialog element itself) closes it
          if (e.target === ref.current) close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-2xl border border-brand-bright/30 bg-panel p-0 text-(--text) shadow-[0_0_60px_-10px_rgba(0,150,219,0.5)] backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-start gap-3 border-b border-white/10 p-5 sm:px-6">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-bright ring-1 ring-brand-bright/20">
            <Pencil className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="edit-driver-title" className="font-(family-name:--font-display) text-lg font-bold">
              Edit driver
            </h2>
            <p className="text-sm text-muted">Changes apply to future assignments. Trips already given keep the details they had.</p>
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
          <DriverForm
            id={driver.id}
            initial={{ name: driver.name, phone: driver.phone, cabNumber: driver.cabNumber, cabModel: driver.cabModel, note: driver.note }}
            onDone={close}
          />
          <div className="mt-5 border-t border-white/10 pt-5">
            <DriverActiveButton id={driver.id} active={driver.active} />
          </div>
        </div>
      </dialog>
    </>
  );
}
