"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/** Set by the search form just before it navigates, so only a fresh "Search Cabs" scrolls (not a reload or a shared link). */
export const SCROLL_FLAG = "bk-scroll-to-results";

/**
 * Sits inside the results header. After a search it scrolls the page down to the results,
 * even when the visitor was already on /book (Next does not scroll for a same-page #hash change).
 */
export function ScrollToResults({ targetId }: { targetId: string }) {
  const query = useSearchParams().toString();

  useEffect(() => {
    let wanted = false;
    try {
      wanted = sessionStorage.getItem(SCROLL_FLAG) === "1";
      sessionStorage.removeItem(SCROLL_FLAG);
    } catch {
      // storage blocked: just skip the scroll
    }
    if (!wanted) return;
    // wait a tick so the layout (phone search bar folding up, new results) has settled
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [query, targetId]);

  return null;
}
