"use client";

import { Check, Phone } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/admin/ui";
import { setEnquiryStatusAction } from "@/lib/server/admin/actions/enquiries";
import type { EnquiryStatus } from "@/lib/server/enquiries";

/** One button that moves an enquiry along: new -> contacted -> closed (and back to new if reopened). */
export function EnquiryStatusButton({ id, status, canManage }: { id: string; status: EnquiryStatus; canManage: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  if (!canManage) return null;

  const next: EnquiryStatus = status === "new" ? "contacted" : status === "contacted" ? "closed" : "new";
  const label = status === "new" ? "Mark contacted" : status === "contacted" ? "Close" : "Reopen";

  return (
    <div className="grid justify-items-stretch gap-1 sm:justify-items-end">
      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await setEnquiryStatusAction(id, next);
            setError(result.ok ? "" : (result.error ?? "Something went wrong."));
          })
        }
      >
        {status === "new" ? <Phone aria-hidden="true" /> : <Check aria-hidden="true" />} {label}
      </Button>
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </div>
  );
}
