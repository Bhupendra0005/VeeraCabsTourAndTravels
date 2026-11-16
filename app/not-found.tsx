import type { Metadata } from "next";
import { ArrowRight, CarFront, Compass, Phone } from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/components/site/page-shell";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: true } };

/** Shown for every wrong URL: same header and footer as the rest of the site, and ways back to something useful. */
export default function NotFound() {
  return (
    <PageShell>
      <section className="section" style={{ paddingTop: "9rem", minHeight: "70vh" }}>
        <div className="shell" style={{ maxWidth: 720, textAlign: "center", paddingInline: 20 }}>
          <p className="mini-label" style={{ textAlign: "center" }}>Error 404</p>
          <h1 className="rc-title" style={{ margin: "10px 0 12px", textAlign: "center" }}>
            This page took a <em>wrong turn.</em>
          </h1>
          <p className="rc-lead" style={{ margin: "0 auto 28px", textAlign: "center" }}>
            The page you are looking for does not exist or has moved. Let us get you back on the road.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            <Link className="btn btn-gold" href="/book">
              <CarFront aria-hidden="true" /> Book a cab <ArrowRight aria-hidden="true" />
            </Link>
            <Link className="btn btn-ghost" href="/">
              Back to home
            </Link>
            <Link className="btn btn-ghost" href="/destinations">
              <Compass aria-hidden="true" /> Destinations
            </Link>
            <Link className="btn btn-ghost" href="/contact">
              <Phone aria-hidden="true" /> Contact us
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
