"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/admin/ui";
import { setReviewPublishedAction } from "@/lib/server/admin/actions/reviews";

export function ReviewToggle({ id, published, canManage }: { id: string; published: boolean; canManage: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  if (!canManage) return null;
  return (
    <div className="grid justify-items-stretch gap-1 sm:justify-items-end">
      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await setReviewPublishedAction(id, !published);
            setError(result.ok ? "" : (result.error ?? "Something went wrong."));
          })
        }
      >
        {published ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />} {published ? "Hide" : "Show"}
      </Button>
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </div>
  );
}
