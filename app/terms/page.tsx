import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { termsSections } from "@/lib/legal/content";
import { getBookingSettings } from "@/lib/server/cms/content";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms and conditions for booking a cab with Veera Tours & Travels.",
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  const settings = await getBookingSettings();
  return <LegalPage eyebrow="Legal" title="Terms & Conditions" crumb="Terms & Conditions" sections={termsSections(settings)} />;
}
