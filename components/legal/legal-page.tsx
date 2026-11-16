import {
  CalendarCheck,
  CalendarDays,
  Car,
  CircleCheck,
  CircleX,
  Clock3,
  Coins,
  FileText,
  Fingerprint,
  Gavel,
  Headset,
  IndianRupee,
  ListOrdered,
  Lock,
  MapPin,
  Phone,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Umbrella,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { LegalToc } from "@/components/legal/legal-toc";
import { PageShell } from "@/components/site/page-shell";
import { HeaderChip, PlainHeader } from "@/components/site/plain-header";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import type { LegalSection } from "@/lib/legal/content";
import { whatsappLink } from "@/lib/site";
import { getSite } from "@/lib/server/cms/content";

/** [main icon, small outline icon] for a section, picked from the words in its title. */
function iconsFor(title: string): [LucideIcon, LucideIcon] {
  const t = title.toLowerCase();
  if (t.includes("how to cancel")) return [ListOrdered, X];
  if (t.includes("cancel") || t.includes("penalty") || t.includes("refund")) return [CircleX, X];
  if (t.includes("fare") || t.includes("payment") || t.includes("price")) return [Coins, IndianRupee];
  if (t.includes("booking")) return [CalendarDays, CalendarCheck];
  if (t.includes("pickup") || t.includes("waiting") || t.includes("trip")) return [Car, MapPin];
  if (t.includes("protection") || t.includes("insurance")) return [Umbrella, ShieldCheck];
  if (t.includes("liab") || t.includes("responsib") || t.includes("safety")) return [ShieldAlert, Scale];
  if (t.includes("privacy") || t.includes("data") || t.includes("information") || t.includes("who we are")) return [Fingerprint, Lock];
  if (t.includes("cookie") || t.includes("security")) return [Lock, ShieldCheck];
  if (t.includes("share")) return [ShieldCheck, Lock];
  if (t.includes("contact") || t.includes("complaint")) return [Headset, Phone];
  if (t.includes("rights") || t.includes("choices")) return [Scale, ShieldCheck];
  if (t.includes("law") || t.includes("jurisdiction")) return [Scale, Gavel];
  return [FileText, CircleCheck];
}

/** "3. Cancellation and refunds" becomes { number: "3", name: "Cancellation and refunds" }. */
function split(title: string, index: number) {
  const match = /^(\d+)\.\s*(.+)$/.exec(title);
  return { number: match ? match[1] : String(index + 1), name: match ? match[2] : title };
}

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function LegalPage({
  eyebrow,
  title,
  crumb,
  sections,
  lead,
}: {
  eyebrow: string;
  title: string;
  crumb: string;
  sections: LegalSection[];
  /** Optional block shown above the sections (for example a summary). */
  lead?: ReactNode;
}) {
  const site = await getSite();
  const words = sections.reduce((sum, s) => sum + s.title.split(/\s+/).length + s.body.join(" ").split(/\s+/).length, 0);
  const minutes = Math.max(1, Math.round(words / 200));
  const items = sections.map((section, index) => ({ section, ...split(section.title, index), id: slug(section.title) || `section-${index + 1}` }));

  return (
    <PageShell>
      <PlainHeader eyebrow={eyebrow} eyebrowIcon={<Scale aria-hidden="true" />} title={title} crumb={crumb}>
        <HeaderChip icon={<FileText />}>{sections.length} sections</HeaderChip>
        <HeaderChip icon={<Clock3 />}>{minutes} min read</HeaderChip>
      </PlainHeader>

      <section className="section pt-8!">
        <div className="shell grid items-start gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-10">
          <aside className="grid gap-5 lg:sticky lg:top-28">
            <LegalToc items={items.map(({ id, number, name }) => ({ id, number, name }))} />

            <div className="rounded-3xl border border-brand-bright/25 bg-linear-to-b from-[#0c1a24]/90 to-panel p-5 shadow-[0_0_44px_-24px_rgba(0,150,219,0.6)]">
              <div className="flex items-center gap-3.5">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-linear-to-br from-brand to-brand-bright text-white shadow-[0_10px_26px_-10px_rgba(0,150,219,0.9)]">
                  <Headset className="size-6" aria-hidden="true" />
                </span>
                <p className="font-(family-name:--font-display) text-xl font-extrabold">Have a question?</p>
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-white/75">We are happy to explain anything here. {site.hours}.</p>
              <div className="mt-4 grid gap-3">
                <a href={site.primaryPhone.href} className="flex h-12 items-center gap-3 rounded-full border border-[#22d3ee]/50 bg-[#22d3ee]/8 px-5 text-sm font-bold transition hover:bg-[#22d3ee]/16">
                  <Phone className="size-4 text-[#22d3ee]" aria-hidden="true" /> {site.primaryPhone.display}
                </a>
                <a
                  href={whatsappLink("Hi Veera Tours & Travels, I have a question about your terms.", site)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 items-center gap-3 rounded-full border border-emerald-400/55 bg-emerald-400/8 px-5 text-sm font-bold transition hover:bg-emerald-400/16"
                >
                  <WhatsAppIcon className="size-5 shrink-0 text-emerald-400" aria-hidden="true" /> Chat on WhatsApp
                </a>
              </div>
            </div>
          </aside>

          <div className="grid gap-5">
            {lead}
            {items.map(({ id, number, name, section }) => {
              const [Icon, Small] = iconsFor(section.title);
              return (
                <article
                  key={id}
                  id={id}
                  className="scroll-mt-28 rounded-3xl border border-brand-bright/25 bg-linear-to-b from-[#0c1a24]/85 to-panel p-5 shadow-[0_0_44px_-26px_rgba(0,150,219,0.7)] transition hover:border-brand-bright/45 sm:p-7"
                >
                  <header className="mb-5 flex items-center gap-4 border-b border-white/10 pb-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-linear-to-br from-brand to-brand-bright text-white shadow-[0_10px_28px_-10px_rgba(0,150,219,0.9)]">
                      <Icon className="size-6" aria-hidden="true" />
                    </span>
                    <h2 className="min-w-0 flex-1 font-(family-name:--font-display) text-2xl font-extrabold leading-tight sm:text-[28px]">
                      {number}. {name}
                    </h2>
                    <span className="hidden size-12 shrink-0 place-items-center rounded-xl border border-white/12 bg-white/5 text-white/65 sm:grid">
                      <Small className="size-5" aria-hidden="true" />
                    </span>
                  </header>
                  <ul className="grid gap-3.5">
                    {section.body.map((paragraph) => (
                      <li key={paragraph} className="flex gap-4 text-base leading-7 text-white/85">
                        <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-[#22d3ee]/15 text-[#22d3ee] ring-1 ring-[#22d3ee]/30">
                          <CircleCheck className="size-4" aria-hidden="true" />
                        </span>
                        <span className="wrap-anywhere">{paragraph}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
