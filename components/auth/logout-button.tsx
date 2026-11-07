"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/payments/checkout-client";

export function LogoutButton({ className = "btn btn-ghost" }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await postJson("/api/auth/logout");
        } finally {
          router.replace("/");
          router.refresh();
        }
      }}
    >
      <LogOut aria-hidden="true" />
      Log out
    </button>
  );
}
