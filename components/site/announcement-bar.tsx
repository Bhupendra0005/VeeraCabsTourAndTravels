"use client";

import Link from "next/link";
import { useSite } from "@/components/site/site-context";

/** Optional notice strip above the header (Admin > Home page > Announcement bar). */
export function AnnouncementBar() {
  const { announcement } = useSite();
  if (!announcement.enabled || !announcement.text) return null;
  const { text, linkLabel, linkHref } = announcement;
  const external = /^https?:\/\//.test(linkHref);
  return (
    <div className="relative z-[70] bg-(--gold) px-4 py-2 text-center text-[13px] font-semibold text-white [overflow-wrap:anywhere]" role="status">
      <span>{text}</span>
      {linkHref && linkLabel ? (
        <>
          {" "}
          {external ? (
            <a href={linkHref} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              {linkLabel}
            </a>
          ) : (
            <Link href={linkHref} className="underline underline-offset-2">
              {linkLabel}
            </Link>
          )}
        </>
      ) : null}
    </div>
  );
}
