"use client";

import { Clock3, Phone } from "lucide-react";
import { useSite } from "@/components/site/site-context";

/**
 * A thin strip above the menu with the phone number(s) (Admin > Pages > Home page > Phone number bar).
 * The numbers and the opening hours come from Admin > Contact & business, so they are never typed twice.
 * On a phone it stays one slim line: the words before the number and the hours are left out, and both numbers fit side by side.
 */
export function TopContactBar() {
  const { site, topbar } = useSite();
  if (!topbar.enabled || !site.primaryPhone.display) return null;
  const second = topbar.showSecondary && site.secondaryPhone.display ? site.secondaryPhone : null;
  const link = "inline-flex items-center py-1.5 font-bold text-white hover:underline hover:underline-offset-2";

  return (
    <div className="relative z-[71] border-b border-white/10 bg-[#050b12] text-[13px] text-white/85">
      <div className="shell flex items-center justify-center gap-x-6 sm:justify-between">
        <p className="m-0 flex items-center justify-center gap-x-2 whitespace-nowrap">
          <Phone className="size-3.5 shrink-0 text-(--gold)" aria-hidden="true" />
          {topbar.label ? <span className="hidden text-white/70 sm:inline">{topbar.label}</span> : null}
          <a href={site.primaryPhone.href} className={link}>
            {site.primaryPhone.display}
          </a>
          {second ? (
            <span className="hidden items-center gap-x-2 min-[340px]:inline-flex">
              <span aria-hidden="true" className="text-white/35">
                ·
              </span>
              <a href={second.href} className={link}>
                {second.display}
              </a>
            </span>
          ) : null}
        </p>
        {topbar.showHours && site.hours ? (
          <p className="m-0 hidden items-center gap-1.5 text-white/70 sm:flex">
            <Clock3 className="size-3.5" aria-hidden="true" />
            {site.hours}
          </p>
        ) : null}
      </div>
    </div>
  );
}
