import type { ReactNode } from "react";
import { BookingModal } from "@/components/site/booking";
import { FloatingActions, SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { ScrollEffects } from "@/components/site/scroll-effects";

/** Common chrome (header, footer, floating actions, booking modal) for inner pages. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <ScrollEffects />
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content">{children}</main>
      <SiteFooter />
      <FloatingActions />
      <BookingModal />
    </>
  );
}
