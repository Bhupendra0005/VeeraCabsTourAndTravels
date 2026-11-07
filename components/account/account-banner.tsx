import type { ReactNode } from "react";

export type BannerStat = { icon: ReactNode; value: ReactNode; label: string; /** 0-100: shows a progress bar under the label. */ progress?: number };

/** Full-width photo banner at the top of the signed-in customer pages: who you are, and three numbers. */
export function AccountBanner({
  eyebrow,
  title,
  subtitle,
  initial,
  stats,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  initial: string;
  stats: BannerStat[];
}) {
  return (
    <section className="relative isolate overflow-hidden border-b border-[#22d3ee]/30 shadow-[0_8px_40px_-18px_rgba(34,211,238,0.6)]">
      <img
        src="/account-banner-1800.webp"
        srcSet="/account-banner-1000.webp 1000w, /account-banner-1800.webp 1800w"
        sizes="100vw"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 size-full object-cover object-[72%_58%]"
        decoding="async"
      />
      {/* keeps the text readable on the left, and melts the photo into the page at the bottom */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-r from-[#031018]/70 via-[#031018]/15 to-transparent" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-linear-to-t from-[#050b0e]/80 to-transparent" />

      <div className="mx-auto flex min-h-[250px] w-full max-w-7xl flex-col justify-between gap-6 px-4 py-6 sm:px-6 lg:min-h-[272px]">
        <div className="flex min-w-0 items-center gap-5">
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-linear-to-br from-[#22d3ee] to-[#0a8fd0] font-(family-name:--font-display) text-3xl font-extrabold text-[#04202c] shadow-[0_10px_34px_-8px_rgba(34,211,238,0.8)] sm:size-[88px] sm:text-4xl">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#22d3ee]">{eyebrow}</p>
            <h1 className="font-(family-name:--font-display) text-3xl leading-tight font-extrabold wrap-anywhere drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] sm:text-4xl">{title}</h1>
            <p className="text-sm text-white/80 wrap-anywhere">{subtitle}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:max-w-[78%] lg:gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-4 rounded-2xl border border-white/12 bg-[#071a2b]/70 px-4 py-3.5 shadow-[0_10px_30px_-16px_rgba(0,0,0,0.8)] backdrop-blur-md">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand/15 text-[#22d3ee] ring-1 ring-[#22d3ee]/25 [&>svg]:size-6">{stat.icon}</span>
              <div className="min-w-0">
                <p className="font-(family-name:--font-display) text-2xl leading-none font-extrabold wrap-anywhere">{stat.value}</p>
                <p className="mt-1 text-sm text-white/75">{stat.label}</p>
                {stat.progress !== undefined ? (
                  <div className="mt-2 h-1.5 w-full min-w-28 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={stat.progress} aria-valuemin={0} aria-valuemax={100} aria-label={stat.label}>
                    <div className="h-full rounded-full bg-linear-to-r from-[#22d3ee] to-brand-bright" style={{ width: `${stat.progress}%` }} />
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
