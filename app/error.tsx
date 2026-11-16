"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Last-resort screen if a page crashes: friendly text, a retry, and no technical details for the visitor. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Page error", error.digest ?? "", error.message);
  }, [error]);
  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px", background: "#050b0e", color: "#f1f5f7", textAlign: "center" }}
    >
      <div style={{ maxWidth: 520 }}>
        <p style={{ letterSpacing: "0.2em", fontSize: 12, fontWeight: 800, color: "#22d3ee", textTransform: "uppercase" }}>Something went wrong</p>
        <h1 style={{ fontSize: 32, margin: "10px 0 12px", fontWeight: 800 }}>We hit a bump on the road</h1>
        <p style={{ margin: "0 0 24px", color: "rgba(255,255,255,0.75)" }}>
          This page could not load. Please try again. If it keeps happening, call us and we will help you right away.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={reset} className="btn btn-gold">
            Try again
          </button>
          <Link href="/" className="btn btn-ghost">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
