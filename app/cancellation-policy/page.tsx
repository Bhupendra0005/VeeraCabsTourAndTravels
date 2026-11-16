import type { Metadata } from "next";
import { CancellationLead } from "@/components/legal/cancellation-lead";
import { LegalPage } from "@/components/legal/legal-page";
import { describeMinutes } from "@/lib/booking/config";
import { refundBands } from "@/lib/booking/refund";
import { cancellationSections } from "@/lib/legal/content";
import { getBookingSettings, getSite } from "@/lib/server/cms/content";

export const metadata: Metadata = {
  title: "Cancellation Policy",
  description: "Free or partial refund on cancellation depending on how early you cancel. Read the Veera Tours & Travels cancellation and refund policy.",
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
      lead={<CancellationLead free={describeMinutes(settings.freeCancelMinutes)} bands={refundBands(settings.freeCancelMinutes, settings.refundSlabs)} />}
    />
  );
}
