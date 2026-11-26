import { FileText, Receipt } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { id: "invoices", href: "/admin/invoices", label: "Invoices", Icon: Receipt },
  { id: "quotations", href: "/admin/invoices/quotations", label: "Quotations", Icon: FileText },
] as const;

/** The two halves of the invoice section: bills, and price quotations that can become bookings. */
export function InvoiceTabs({ active }: { active: (typeof TABS)[number]["id"] }) {
  return (
    <nav aria-label="Invoice section" className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-white/3 p-1.5 sm:flex sm:w-fit">
      {TABS.map(({ id, href, label, Icon }) => (
        <Link
          key={id}
          href={href}
          aria-current={active === id ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold transition [&>svg]:size-4",
            active === id ? "bg-brand text-white shadow-[0_8px_20px_-8px_rgba(60,184,242,0.9)]" : "text-white/70 hover:bg-white/8 hover:text-white",
          )}
        >
          <Icon aria-hidden="true" /> {label}
        </Link>
      ))}
    </nav>
  );
}
