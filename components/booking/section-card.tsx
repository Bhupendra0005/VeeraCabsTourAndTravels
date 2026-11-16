import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** A booking-page card with a header strip (icon, title, optional action) and a padded body. */
export function SectionCard({
  icon,
  title,
  aside,
  children,
  className,
  bodyClassName,
}: {
  icon?: ReactNode;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("mmt-rise overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_1px_2px_rgba(0,0,0,0.1)]", className)}>
      <header className="rv-card-head flex items-center gap-3.5 border-b border-line px-4 py-3.5 sm:px-5">
        {icon ? <span className="rv-card-icon grid size-11 flex-none place-items-center rounded-full text-white [&>svg]:size-[22px]">{icon}</span> : null}
        <h2 className="font-(family-name:--font-display) text-[1.3rem] font-bold leading-tight text-[#0a2a5e]">{title}</h2>
        {aside ? <span className="ml-auto text-sm">{aside}</span> : null}
      </header>
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
