"use client";

import { ListOrdered } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

export type TocItem = { id: string; number: string; name: string };

/** "On this page": the section being read is highlighted as you scroll. */
export function LegalToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const targets = items.map((item) => document.getElementById(item.id)).filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="Contents" className="rounded-3xl border border-brand-bright/25 bg-linear-to-b from-[#0c1a24]/90 to-panel p-4 shadow-[0_0_44px_-24px_rgba(0,150,219,0.6)] sm:p-5">
      <p className="mb-4 flex items-center gap-3 border-b border-white/10 px-1 pb-4 text-sm font-extrabold uppercase tracking-wide text-[#22d3ee]">
        <ListOrdered className="size-5" aria-hidden="true" /> On this page
      </p>
      <ol className="grid gap-1.5">
        {items.map(({ id, number, name }) => {
          const on = id === active;
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                onClick={() => setActive(id)}
                aria-current={on ? "location" : undefined}
                className={cn(
                  "flex items-center gap-3.5 rounded-xl px-3 py-2.5 text-[15px] font-medium transition",
                  on
                    ? "bg-linear-to-r from-brand/30 to-brand/10 text-white ring-1 ring-brand-bright/30 shadow-[0_0_24px_-10px_rgba(34,211,238,0.8)]"
                    : "text-white/80 hover:bg-white/6 hover:text-white",
                )}
              >
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition", on ? "bg-[#22d3ee] text-[#04202c]" : "bg-white/10 text-white/75")}>{number}</span>
                <span className="min-w-0 wrap-anywhere">{name}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
