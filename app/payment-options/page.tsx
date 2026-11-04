import type { Metadata } from "next";
import { Banknote, Landmark, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageShell } from "@/components/site/page-shell";
import {
  CtaBand,
  PageHero,
  SectionHead,
  delay,
} from "@/components/site/page-parts";
import { paymentMethods } from "@/lib/content";

export const metadata: Metadata = {
  title: "Payment Options",
  description:
    "Simple, transparent payment for your Pune cab booking with Veera Tours & Travels. No advance payment required to enquire.",
  alternates: { canonical: "/payment-options" },
};

const icons: Record<string, LucideIcon> = {
  UPI: Smartphone,
  Cash: Banknote,
  "Bank transfer": Landmark,
};

export default function PaymentOptionsPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Payment options"
        title={
          <>
            Simple, transparent <em>payment.</em>
          </>
        }
        description="Confirm your fare first, then pay in the way that suits you. No payment is taken on this website."
        crumbs={[{ label: "Home", href: "/" }, { label: "Payment Options" }]}
      />

      <section className="section">
        <div className="shell">
          <SectionHead
            eyebrow="How to pay"
            title={<>Pay the way <span className="gold">you prefer.</span></>}
            description="Ask our team for the payment details that apply to your booking."
          />
          <div className="service-grid">
            {paymentMethods.map((method, index) => {
              const Icon = icons[method.title] ?? Banknote;
              return (
                <article
                  className="service-card"
                  key={method.title}
                  data-reveal
                  style={delay(index % 3, 80)}
                >
                  <div className="service-top">
                    <span className="service-icon">
                      <Icon aria-hidden="true" />
                    </span>
                  </div>
                  <h3>{method.title}</h3>
                  <p>{method.text}</p>
                </article>
              );
            })}
          </div>
          <CtaBand
            title="Have a question about payment?"
            text="Message us on WhatsApp or call and we will explain how payment works for your booking."
          />
        </div>
      </section>
    </PageShell>
  );
}
