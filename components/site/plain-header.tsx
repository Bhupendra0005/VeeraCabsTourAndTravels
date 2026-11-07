import { House, Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Page heading for the text pages (Terms, Cancellation, Payment options): breadcrumb, small label, big title,
 * optional text and chips, with a photo that fades in from the right edge.
 */
export function PlainHeader({
  eyebrow,
  eyebrowIcon,
  title,
  description,
  crumb,
  children,
}: {
  eyebrow: string;
  /** Small icon before the label. Defaults to sparkles. */
  eyebrowIcon?: ReactNode;
  title: ReactNode;
  description?: string;
  crumb: string;
  /** Usually a row of small info chips. */
  children?: ReactNode;
}) {
  return (
    <header className="relative isolate overflow-hidden pb-8 pt-32 sm:pt-36">
      <img
        src="/admin-banner-1800.webp"
        srcSet="/admin-banner-1000.webp 1000w, /admin-banner-1800.webp 1800w"
        sizes="(min-width: 768px) 70vw, 100vw"
        alt=""
        aria-hidden="true"
        className="absolute inset-y-0 right-0 -z-20 h-full w-full object-cover object-[72%_60%] opacity-45 mask-[linear-gradient(to_right,transparent,black_55%)] md:w-[72%] md:opacity-100 md:mask-[linear-gradient(to_right,transparent,black_38%)]"
        decoding="async"
      />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-28 bg-linear-to-t from-[#050b0e] to-transparent" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-b from-[#050b0e]/60 via-transparent to-transparent" />

      <div className="shell">
        <nav className="flex flex-wrap items-center gap-2.5 text-sm font-medium text-white/80" aria-label="Breadcrumb">
          <Link href="/" className="inline-flex items-center gap-1.5 text-[#22d3ee] transition hover:text-white">
            <House className="size-4" aria-hidden="true" /> Home
          </Link>
          <span className="text-white/40" aria-hidden="true">
            /
          </span>
          <span>{crumb}</span>
        </nav>
        <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#22d3ee]/45 bg-[#04202c]/60 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#22d3ee] backdrop-blur [&>svg]:size-4">
          {eyebrowIcon ?? <Sparkles aria-hidden="true" />}
          {eyebrow}
        </span>
        <h1 className="mt-4 font-(family-name:--font-display) text-4xl font-extrabold leading-[1.05] tracking-tight drop-shadow-[0_2px_14px_rgba(0,0,0,0.55)] sm:text-5xl lg:text-6xl">{title}</h1>
        {description ? <p className="mt-4 max-w-xl text-base text-white/80 sm:text-lg">{description}</p> : null}
        {children ? <div className="mt-6 flex flex-wrap gap-3">{children}</div> : null}
      </div>
    </header>
  );
}

export function HeaderChip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-[#071a2b]/70 px-4 py-2 text-sm font-semibold text-white/90 backdrop-blur [&>svg]:size-4 [&>svg]:text-[#22d3ee]">
      {icon}
      {children}
    </span>
  );
}
