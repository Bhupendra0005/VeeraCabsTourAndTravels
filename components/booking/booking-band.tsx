import { BadgeCheck, Clock3, IndianRupee, ShieldCheck, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { ikUrl } from "@/lib/cms/images";

export type BookingHero = {
  lead: string;
  emphasis: string;
  subtitle: string;
  points: string[];
  /** Owner's own banner picture; empty = the built-in one. */
  image: string;
};

const POINT_ICONS = [Zap, ShieldCheck, IndianRupee, Clock3, BadgeCheck];

/**
 * The strip under the site header on the booking pages. With `hero` it is the big banner (heading, three highlights and
 * a picture) with the search box overlapping its bottom edge; without it, a slim navy bar. The heading stays in the page
 * for screen readers and search engines either way.
 */
export function BookingBand({ title, hero, wide, curved, children }: { title: string; hero?: BookingHero; /** Same width as the site header. */ wide?: boolean; /** Gently curved bottom edge (review page). */ curved?: boolean; children?: ReactNode }) {
  const wrap = wide ? "mmt-wrap mmt-wrap--wide" : "mmt-wrap";
  if (!hero) {
    return (
      <div className={curved ? "mmt-band mmt-band--curve" : "mmt-band"}>
        <div className={wrap}>
          <h1 className="sr-only">{title}</h1>
          {children}
        </div>
      </div>
    );
  }

  const small = hero.image ? ikUrl(hero.image, 1000) : "/book-hero-1000.webp";
  const large = hero.image ? ikUrl(hero.image, 1800) : "/book-hero-1800.webp";
  return (
    <div className="mmt-band mmt-band--hero">
      <div className="bk-hero-art" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={large} srcSet={`${small} 1000w, ${large} 1800w`} sizes="(min-width: 1100px) 1100px, 100vw" alt="" width={1800} height={600} fetchPriority="high" decoding="async" />
      </div>
      <div className={wrap}>
        <div className="bk-hero-text">
          <h1>
            {hero.lead} {hero.emphasis ? <span className="bk-hero-em">{hero.emphasis}</span> : null}
          </h1>
          {hero.subtitle ? <p className="bk-hero-sub">{hero.subtitle}</p> : null}
          {hero.points.length > 0 ? (
            <ul className="bk-hero-points">
              {hero.points.map((label, index) => {
                const Icon = POINT_ICONS[index % POINT_ICONS.length];
                return (
                  <li key={label}>
                    <span className="bk-hero-icon">
                      <Icon aria-hidden="true" />
                    </span>
                    {label}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}
