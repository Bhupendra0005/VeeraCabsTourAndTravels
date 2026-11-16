import type { ReactNode } from "react";
import { BookingLauncher } from "@/components/site/booking";
import { FloatingActions, SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { ScrollEffects } from "@/components/site/scroll-effects";

/** Common chrome (header, footer, floating actions, booking modal) for inner pages. */
export function PageShell({ children, footer = true }: { children: ReactNode; /** The booking pages hide the site footer, like MakeMyTrip's checkout flow. */ footer?: boolean }) {
  return (
    <>
      <ScrollEffects />
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content">{children}</main>
      {footer ? <SiteFooter /> : null}
      <FloatingActions />
      <BookingLauncher />
    </>
  );
}
