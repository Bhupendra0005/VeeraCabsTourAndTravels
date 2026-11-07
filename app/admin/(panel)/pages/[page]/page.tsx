import type { Metadata } from "next";
import {
  Building2,
  Car,
  CircleHelp,
  ExternalLink,
  Globe,
  House,
  IndianRupee,
  Image as ImageIcon,
  Map as MapIcon,
  MapPin,
  Megaphone,
  Phone,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Tags,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentEditor } from "@/components/admin/document-editor";
import { PageHeader } from "@/components/admin/ui";
import { getDocDefinition } from "@/lib/cms/docs";
import { getPage } from "@/lib/cms/pages";
import { resetDocAction, saveDocAction } from "@/lib/server/admin/actions/content";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { DEFAULTS } from "@/lib/server/cms/defaults";
import { readDoc, readRaw } from "@/lib/server/cms/store";
import { cn } from "@/lib/utils/cn";

const ICONS: Record<string, LucideIcon> = {
  home: House,
  megaphone: Megaphone,
  image: ImageIcon,
  shield: ShieldCheck,
  tags: Tags,
  sparkles: Sparkles,
  map: MapIcon,
  star: Star,
  car: Car,
  help: CircleHelp,
  phone: Phone,
  building: Building2,
  "map-pin": MapPin,
  share: Share2,
  rupee: IndianRupee,
  wallet: Wallet,
  globe: Globe,
};

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
  const page = getPage((await params).page);
  return { title: page ? `${page.label} (edit)` : "Edit page" };
}

export default async function EditPagePage({
  params,
  searchParams,
}: {
  params: Promise<{ page: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("content.manage");
  const page = getPage((await params).page);
  if (!page) notFound();

  const asked = (await searchParams).tab;
  const tabId = Array.isArray(asked) ? asked[0] : asked;
  const section = page.sections.find((s) => s.id === tabId) ?? page.sections[0];

  const definition = getDocDefinition(section.doc);
  if (!definition) notFound();
  const defaults = DEFAULTS[section.doc] as Record<string, unknown>;
  const [value, stored] = await Promise.all([readDoc(section.doc, defaults), readRaw(section.doc).catch(() => null)]);

  const fields = section.fields ? definition.fields.filter((f) => section.fields!.includes(f.key)) : definition.fields;
  const PageIcon = ICONS[page.icon] ?? House;
  const SectionIcon = ICONS[section.icon] ?? PageIcon;
  const view = section.viewPath ?? page.viewPath;

  return (
    <div className="grid gap-6">
      <PageHeader
        icon={<PageIcon />}
        title={page.label}
        description={page.description}
        actions={
          <Link
            href={view}
            target="_blank"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold transition hover:bg-white/10"
          >
            <ExternalLink className="size-4" aria-hidden="true" /> View on website
          </Link>
        }
      />

      {page.sections.length > 1 ? (
        <nav aria-label={`${page.label} sections`} className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
          {page.sections.map((s) => {
            const Icon = ICONS[s.icon] ?? PageIcon;
            const on = s.id === section.id;
            return (
              <Link
                key={s.id}
                href={`/admin/pages/${page.id}?tab=${s.id}`}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition [&>svg]:size-4",
                  on
                    ? "border-transparent bg-linear-to-r from-brand to-brand-bright text-white shadow-[0_10px_28px_-10px_rgba(0,150,219,0.85)]"
                    : "border-white/10 bg-white/4 text-white/80 hover:border-white/25 hover:text-white",
                )}
              >
                <Icon aria-hidden="true" /> {s.label}
              </Link>
            );
          })}
        </nav>
      ) : null}

      <div className="flex items-center gap-4 rounded-2xl border border-brand-bright/25 bg-linear-to-b from-[#0c1a24] to-panel p-4 sm:p-5">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-brand/25 to-brand/5 text-brand-bright ring-1 ring-brand-bright/25">
          <SectionIcon className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-(family-name:--font-display) text-lg font-bold">{section.label}</h2>
          <p className="text-sm text-muted">{section.text}</p>
        </div>
        <Link href={view} target="_blank" className="hidden items-center gap-1.5 text-sm font-semibold text-brand-bright hover:underline sm:inline-flex">
          <ExternalLink className="size-4" aria-hidden="true" /> See it live
        </Link>
      </div>

      <DocumentEditor
        key={`${page.id}-${section.id}`}
        docKey={section.doc}
        fields={fields}
        initial={value}
        customised={stored !== null}
        save={saveDocAction}
        // "Restore original" resets the whole document, so it is only offered when the section is the whole document
        reset={section.fields ? undefined : resetDocAction}
        reloadHref={`/admin/pages/${page.id}?tab=${section.id}`}
      />
    </div>
  );
}
