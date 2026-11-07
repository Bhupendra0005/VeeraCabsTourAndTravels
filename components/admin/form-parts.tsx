"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import { Alert, Button } from "@/components/admin/ui";
import type { ActionState } from "@/lib/admin/action-state";

/** Submit button that disables itself while the server action runs. */
export function SubmitButton({
  children,
  pendingText = "Saving...",
  ...props
}: ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (state.error) return <Alert tone="danger">{state.error}</Alert>;
  if (state.ok && state.message) return <Alert tone="success">{state.message}</Alert>;
  return null;
}
