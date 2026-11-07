import type { Metadata } from "next";
import { CancellationLead } from "@/components/legal/cancellation-lead";
import { LegalPage } from "@/components/legal/legal-page";
import { describeMinutes } from "@/lib/booking/config";
import { cancellationSections } from "@/lib/legal/content";
import { getBookingSettings, getSite } from "@/lib/server/cms/content";

export const metadata: Metadata = {
  title: "Cancellation Policy",
  description: "Free cancellation until the cut-off before pickup. Read the Veera Tours & Travels cancellation and refund policy.",
  alternates: { canonical: "/cancellation-policy" },
};

export default async function CancellationPolicyPage() {
  const [settings, site] = await Promise.all([getBookingSettings(), getSite()]);
  return (
    <LegalPage
      eyebrow="Legal"
      title="Cancellation Policy"
      crumb="Cancellation Policy"
      sections={cancellationSections(settings, site)}
      lead={<CancellationLead free={describeMinutes(settings.freeCancelMinutes)} />}
    />
  );
}
