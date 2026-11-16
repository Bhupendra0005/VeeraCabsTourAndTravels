import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { PRIVACY_UPDATED, privacySections } from "@/lib/legal/privacy";
import { getSite } from "@/lib/server/cms/content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Veera Tours & Travels collects, uses and protects your personal information when you book a cab with us.",
  alternates: { canonical: "/privacy-policy" },
};

export default async function PrivacyPolicyPage() {
  const site = await getSite();
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      crumb="Privacy Policy"
      sections={privacySections(site)}
      lead={
        <p className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/75">
          Last updated: <b className="text-white">{PRIVACY_UPDATED}</b>. We keep your information safe and use it only to run your booking and support you. We never sell it.
        </p>
      }
    />
  );
}
