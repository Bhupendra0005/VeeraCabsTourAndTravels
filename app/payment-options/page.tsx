import type { Metadata } from "next";
import {
  ArrowRight,
  Banknote,
  CalendarCheck,
  CreditCard,
  FileText,
  Landmark,
  Lock,
  ShieldCheck,
  Smartphone,
  Ticket,
  Undo2,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/components/site/page-shell";
import { HeaderChip, PlainHeader } from "@/components/site/plain-header";
import { describeMinutes } from "@/lib/booking/config";
import { getBookingSettings, getPaymentMethods, getSite } from "@/lib/server/cms/content";

export const metadata: Metadata = {
  title: "Payment Options",
  description: "Pay online securely or choose UPI, cash or bank transfer for your Pune cab booking with Veera Tours & Travels.",
  alternates: { canonical: "/payment-options" },
};

const icons: Record<string, LucideIcon> = {
  UPI: Smartphone,
  Cash: Banknote,
  "Bank transfer": Landmark,
};

/** A phone showing a confirmed payment. */
function PhoneArt() {
  return (
    <svg viewBox="0 0 130 150" className="h-36 w-auto shrink-0 drop-shadow-[0_10px_30px_rgba(34,211,238,0.45)]" aria-hidden="true">
      <defs>
        <linearGradient id="po-phone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1b6fd0" />
          <stop offset="1" stopColor="#0a2d66" />
        </linearGradient>
      </defs>
      <g transform="rotate(8 65 75)">
        <rect x="26" y="8" width="78" height="134" rx="14" fill="url(#po-phone)" stroke="#38bdf8" strokeWidth="3" />
        <rect x="33" y="18" width="64" height="114" rx="8" fill="#071a3a" />
        <circle cx="65" cy="58" r="20" fill="#0b6f8a" stroke="#22d3ee" strokeWidth="3" />
        <path d="M55 58 L62 65 L76 50" fill="none" stroke="#e8fbff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="45" y="92" width="40" height="5" rx="2.5" fill="#38bdf8" opacity=".9" />
        <rect x="50" y="104" width="30" height="5" rx="2.5" fill="#38bdf8" opacity=".55" />
      </g>
      <circle cx="116" cy="20" r="3" fill="#22d3ee" />
      <circle cx="14" cy="120" r="2.5" fill="#22d3ee" opacity=".7" />
    </svg>
  );
}

const card = "rounded-3xl border border-white/10 bg-linear-to-b from-[#0c1a24]/80 to-panel shadow-[0_20px_50px_-30px_rgba(0,0,0,0.9)]";

export default async function PaymentOptionsPage() {
  const [methods, rules, site] = await Promise.all([getPaymentMethods(), getBookingSettings(), getSite()]);
  const cutoff = describeMinutes(rules.balanceCutoffHours * 60);
  const partPay = rules.partPayPercent < 100;

  const steps: { icon: LucideIcon; title: string; text: string }[] = [
    { icon: CalendarCheck, title: "Pick your fare", text: "Search your route and see the fixed fare, with GST shown separately, before you pay anything." },
    { icon: CreditCard, title: "Pay securely online", text: partPay ? `Pay the full amount, or just ${rules.partPayPercent}% to reserve your cab.` : "Pay the full amount to reserve your cab." },
    { icon: Ticket, title: "Get your ticket", text: "Your e-ticket and invoice arrive by email and stay in My Trips." },
  ];

  const assurances: { icon: LucideIcon; title: string; text: string }[] = [
    { icon: Lock, title: "Secure payments", text: "Online payments are handled by Razorpay. We never see or store your card or UPI details." },
    { icon: FileText, title: "A proper invoice", text: `Every booking gets a GST invoice${site.gstin ? ` (GSTIN ${site.gstin})` : ""} you can download any time.` },
    { icon: Undo2, title: "Refunds to the same place", text: "If a booking is cancelled in time, the refund goes back to the method you paid with, usually in 5 to 7 working days." },
  ];

  return (
    <PageShell>
      <PlainHeader
        eyebrow="Payment options"
        eyebrowIcon={<CreditCard aria-hidden="true" />}
        crumb="Payment Options"
        title={
          <>
            Simple, transparent <span className="text-[#22d3ee]">payment.</span>
          </>
        }
        description="Know the fare first, then pay the way that suits you: securely online, or with UPI, cash or bank transfer."
      >
        <HeaderChip icon={<ShieldCheck />}>Secured by Razorpay</HeaderChip>
        <HeaderChip icon={<FileText />}>GST invoice</HeaderChip>
        {partPay ? <HeaderChip icon={<Wallet />}>Reserve with {rules.partPayPercent}%</HeaderChip> : null}
      </PlainHeader>

      <section className="section pt-6!">
        <div className="shell grid gap-8">
          {/* Online payment + steps */}
          <div className="grid items-stretch gap-5 lg:grid-cols-2">
            <div className={`${card} relative overflow-hidden border-brand-bright/25 p-6 sm:p-7`}>
              <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 size-64 rounded-full bg-[#22d3ee]/15 blur-[80px]" />
              <div className="relative flex h-full items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-3">
                    <Zap className="mt-1 size-9 shrink-0 text-[#22d3ee]" aria-hidden="true" />
                    <h2 className="font-(family-name:--font-display) text-2xl font-extrabold leading-tight sm:text-3xl">The fastest way to confirm your cab</h2>
                  </div>
                  <p className="mt-3 text-[15px] leading-relaxed text-white/80">
                    Pay on the website with UPI, cards or net banking.{" "}
                    {partPay
                      ? `Reserve with ${rules.partPayPercent}% now; the balance can be paid online until ${cutoff} before departure, or to the driver at the end of the trip.`
                      : "Your booking is confirmed the moment the payment goes through."}
                  </p>
                  <Link
                    href="/book"
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-linear-to-r from-[#22d3ee] to-brand-bright px-7 py-3.5 text-sm font-bold text-[#04202c] shadow-[0_12px_32px_-10px_rgba(34,211,238,0.7)] transition hover:brightness-110"
                  >
                    Book and pay online <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
                <div className="hidden sm:block">
                  <PhoneArt />
                </div>
              </div>
            </div>

            <ol className={`${card} grid gap-3 border-brand-bright/25 p-3 sm:p-4`}>
              {steps.map(({ icon: Icon, title, text }, index) => (
                <li key={title} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/25 p-3 pr-5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#22d3ee] text-sm font-extrabold text-[#04202c] shadow-[0_0_16px_rgba(34,211,238,0.6)]">{index + 1}</span>
                  <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-linear-to-br from-brand/25 to-brand/5 text-[#22d3ee] ring-1 ring-brand-bright/25">
                    <Icon className="size-7" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold">{title}</h3>
                    <p className="text-sm leading-relaxed text-white/75">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Other ways */}
          {methods.length > 0 ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#22d3ee]">Other ways to pay</p>
              <h2 className="mt-1 font-(family-name:--font-display) text-3xl font-extrabold sm:text-4xl">Prefer to pay another way?</h2>
              <p className="mt-1.5 text-white/75">Ask our team for the payment details that apply to your booking.</p>
              <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {methods.map((method) => {
                  const Icon = icons[method.title] ?? Banknote;
                  return (
                    <article key={method.title} className={`${card} group flex items-center gap-5 border-brand-bright/25 p-5 transition hover:-translate-y-0.5 hover:border-brand-bright/45`}>
                      <span className="grid size-[72px] shrink-0 place-items-center rounded-2xl bg-linear-to-br from-brand/25 to-brand/5 text-[#22d3ee] ring-1 ring-brand-bright/25 transition group-hover:shadow-[0_0_30px_-6px_rgba(34,211,238,0.7)]">
                        <Icon className="size-9" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-xl font-extrabold">{method.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-white/75">{method.text}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Assurances */}
          <div className="grid gap-5 lg:grid-cols-3">
            {assurances.map(({ icon: Icon, title, text }) => (
              <div key={title} className={`${card} flex items-center gap-4 border-brand-bright/20 p-4 pr-5`}>
                <span className="grid size-16 shrink-0 place-items-center rounded-full bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/25">
                  <Icon className="size-7" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold">{title}</h3>
                  <p className="mt-0.5 text-sm leading-relaxed text-white/75">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
