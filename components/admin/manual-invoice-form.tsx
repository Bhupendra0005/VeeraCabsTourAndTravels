"use client";

import { Building2, FilePlus2, IndianRupee, ListPlus, Plus, ReceiptText, Trash2, UserRound, Wallet } from "lucide-react";
import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/admin/form-parts";
import { Chip, Choice, Section } from "@/components/admin/form-sections";
import { DatePicker } from "@/components/admin/pickers";
import { Badge, Button, Field, inputClass, type Tone } from "@/components/admin/ui";
import { idle } from "@/lib/admin/action-state";
import { createManualInvoiceAction } from "@/lib/server/admin/actions/invoices";
import { cn } from "@/lib/utils/cn";
import { cleanMobile } from "@/lib/utils/phone";

const MAX_LINES = 6;

/** One tap adds a line with this description. */
const PRESETS = ["Outstation cab", "Airport transfer", "Hourly rental", "Tour package", "Toll & parking", "Driver allowance", "Waiting charges"];

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "online", label: "Online" },
];

/** Today in India, as yyyy-mm-dd. */
const today = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);

/** Rupees typed in a box -> paise, 0 when empty or not a number. Display only: the server recomputes everything. */
const toPaise = (value: string) => {
  const n = Number(value.replace(/[,\s₹]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
};
const inr = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;

type Line = { title: string; detail: string; amount: string };
const emptyLine = (): Line => ({ title: "", detail: "", amount: "" });
const isBlank = (line: Line) => !line.title.trim() && !line.detail.trim() && !line.amount.trim();

type PayMode = "unpaid" | "part" | "full";

export function ManualInvoiceForm({ defaultGst }: { defaultGst: number }) {
  const [state, action] = useActionState(createManualInvoiceAction, idle);
  // controlled fields: a form action resets plain inputs, which would wipe the whole form when a check fails
  const [v, setV] = useState({
    date: today(),
    name: "",
    phone: "",
    email: "",
    address: "",
    gstCompany: "",
    gstin: "",
    discount: "",
    gstPercent: String(defaultGst),
    paid: "",
    method: "cash",
    note: "",
    tollTerm: "",
    parkingTerm: "",
    taxTerm: "",
  });
  const [wantGst, setWantGst] = useState(false);
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [payMode, setPayMode] = useState<PayMode>("unpaid");
  const bind = (key: keyof typeof v) => ({
    value: v[key],
    onChange: (e: { target: { value: string } }) => setV((current) => ({ ...current, [key]: e.target.value })),
  });
  const setLine = (index: number, key: keyof Line, value: string) =>
    setLines((current) => current.map((line, i) => (i === index ? { ...line, [key]: value } : line)));
  const addPreset = (title: string) =>
    setLines((current) => {
      const free = current.findIndex(isBlank);
      if (free >= 0) return current.map((line, i) => (i === free ? { ...line, title } : line));
      return current.length >= MAX_LINES ? current : [...current, { ...emptyLine(), title }];
    });

  const subtotal = lines.reduce((sum, line) => sum + toPaise(line.amount), 0);
  const discount = Math.min(toPaise(v.discount), subtotal);
  const gstPercent = Number(v.gstPercent) || 0;
  const gst = Math.round(((subtotal - discount) * gstPercent) / 100);
  const total = subtotal - discount + gst;
  // what is paid follows the choice: nothing, a part the owner types, or the whole total (which keeps up when the lines change)
  const paid = payMode === "full" ? total : payMode === "part" ? Math.min(toPaise(v.paid), total) : 0;
  const balance = total - paid;
  const gstOptions = [...new Set([0, 5, 12, 18, defaultGst])].sort((a, b) => a - b);
  const filled = lines.filter((line) => !isBlank(line));
  const ready = subtotal > 0 && v.name.trim().length >= 2;
  const status: { label: string; tone: Tone } | null = total <= 0 ? null : balance === 0 ? { label: "Paid", tone: "success" } : paid > 0 ? { label: "Part paid", tone: "warning" } : { label: "Unpaid", tone: "danger" };
  const rowGrid = "md:grid-cols-[28px_minmax(0,1.4fr)_minmax(0,1fr)_150px_40px]";

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="grid min-w-0 gap-6">
        <Section icon={<UserRound />} title="Customer" hint="Who the invoice is for. Only the name is needed.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer name" htmlFor="mi-name">
              <input id="mi-name" name="name" required maxLength={80} autoComplete="off" className={inputClass} placeholder="Full name" {...bind("name")} />
            </Field>
            <Field label="Invoice date" htmlFor="mi-date">
              <DatePicker id="mi-date" name="date" size="lg" value={v.date} onChange={(date) => setV((cur) => ({ ...cur, date }))} />
            </Field>
            <Field label="Mobile (optional)" htmlFor="mi-phone">
              <input
                id="mi-phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                title="Enter a 10-digit mobile number starting with 6, 7, 8 or 9."
                autoComplete="off"
                className={inputClass}
                placeholder="98765 43210"
                value={v.phone}
                onChange={(e) => setV((cur) => ({ ...cur, phone: cleanMobile(e.target.value) }))}
              />
            </Field>
            <Field label="Email (optional)" htmlFor="mi-email">
              <input id="mi-email" name="email" type="email" maxLength={254} autoComplete="off" className={inputClass} placeholder="name@example.com" {...bind("email")} />
            </Field>
            <Field label="Address (optional)" htmlFor="mi-address" className="sm:col-span-2">
              <input id="mi-address" name="address" maxLength={160} autoComplete="off" className={inputClass} placeholder="Office / house, area, city" {...bind("address")} />
            </Field>
          </div>

          <div className="mt-5 rounded-xl border border-line bg-black/20 p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" checked={wantGst} onChange={(e) => setWantGst(e.target.checked)} className="size-5 accent-brand" />
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Building2 className="size-4 text-brand-bright" aria-hidden="true" /> Bill to a company with a GSTIN
              </span>
            </label>
            {wantGst ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Company name" htmlFor="mi-company">
                  <input id="mi-company" name="gstCompany" maxLength={120} autoComplete="off" className={inputClass} {...bind("gstCompany")} />
                </Field>
                <Field label="GSTIN" htmlFor="mi-gstin" hint="15 characters, e.g. 27ABCDE1234F1Z5">
                  <input
                    id="mi-gstin"
                    name="gstin"
                    maxLength={15}
                    autoComplete="off"
                    className={`${inputClass} uppercase`}
                    value={v.gstin}
                    onChange={(e) => setV((cur) => ({ ...cur, gstin: e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "") }))}
                  />
                </Field>
              </div>
            ) : null}
          </div>
        </Section>

        <Section icon={<ReceiptText />} title="Toll, parking & tax" hint="Printed on the invoice. Choose whether each one is in the price or paid extra, as per receipt.">
          <div className="grid gap-4">
            {(
              [
                ["tollTerm", "Toll"],
                ["parkingTerm", "Parking"],
                ["taxTerm", "State tax"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <p className="w-24 text-sm font-semibold">{label}</p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
                  {[
                    { value: "included", label: "Included" },
                    { value: "extra", label: "Extra, as per receipt" },
                    { value: "", label: "Don't show" },
                  ].map((option) => (
                    <Choice key={option.value} name={key} value={option.value} checked={v[key] === option.value} onChange={() => setV((current) => ({ ...current, [key]: option.value }))}>
                      {option.label}
                    </Choice>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section icon={<ListPlus />} title="Items" hint={`What the customer is paying for. Up to ${MAX_LINES} items, amounts before GST.`}>
          <input type="hidden" name="items" value={JSON.stringify(lines)} />

          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold text-muted">Quick add</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((title) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => addPreset(title)}
                  disabled={lines.length >= MAX_LINES && !lines.some(isBlank)}
                  className="rounded-full border border-white/12 bg-black/30 px-3.5 py-1.5 text-[13px] font-semibold text-muted transition hover:border-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                  + {title}
                </button>
              ))}
            </div>
          </div>

          <div className={cn("hidden gap-3 px-1 pb-2 text-[11px] font-bold tracking-wide text-muted uppercase md:grid", rowGrid)}>
            <span />
            <span>Description</span>
            <span>Details (optional)</span>
            <span className="text-right">Amount</span>
            <span />
          </div>

          <div className="grid gap-3">
            {lines.map((line, index) => (
              <div key={index} className={cn("grid gap-2.5 rounded-xl border border-line bg-black/20 p-3 md:items-center md:gap-3 md:border-0 md:bg-transparent md:p-0", rowGrid)}>
                <span className="hidden size-7 place-items-center rounded-full bg-white/8 text-xs font-bold text-muted md:grid" aria-hidden="true">
                  {index + 1}
                </span>
                <div className="flex items-center justify-between md:hidden">
                  <span className="text-xs font-bold tracking-wide text-muted uppercase">Item {index + 1}</span>
                  <Button variant="ghost" size="sm" disabled={lines.length === 1} aria-label={`Remove item ${index + 1}`} onClick={() => setLines((current) => current.filter((_, i) => i !== index))}>
                    <Trash2 aria-hidden="true" /> Remove
                  </Button>
                </div>
                <input
                  aria-label={`Item ${index + 1}: description`}
                  maxLength={80}
                  autoComplete="off"
                  className={inputClass}
                  placeholder="e.g. Pune to Mumbai cab, Innova"
                  value={line.title}
                  onChange={(e) => setLine(index, "title", e.target.value)}
                />
                <input
                  aria-label={`Item ${index + 1}: details (optional)`}
                  maxLength={120}
                  autoComplete="off"
                  className={inputClass}
                  placeholder="Date, km, toll included..."
                  value={line.detail}
                  onChange={(e) => setLine(index, "detail", e.target.value)}
                />
                <div className="relative">
                  <IndianRupee className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <input
                    aria-label={`Item ${index + 1}: amount in rupees`}
                    inputMode="decimal"
                    maxLength={12}
                    autoComplete="off"
                    className={cn(inputClass, "pl-9 text-right tabular-nums")}
                    placeholder="0"
                    value={line.amount}
                    onChange={(e) => setLine(index, "amount", e.target.value)}
                  />
                </div>
                {/* a wrapper hides it on a phone: the button's own inline-flex would win over a "hidden" class */}
                <div className="hidden md:block">
                  <Button variant="ghost" size="sm" disabled={lines.length === 1} aria-label={`Remove item ${index + 1}`} onClick={() => setLines((current) => current.filter((_, i) => i !== index))}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button variant="secondary" className="mt-4 w-full border-dashed sm:w-auto" disabled={lines.length >= MAX_LINES} onClick={() => setLines((current) => [...current, emptyLine()])}>
            <Plus aria-hidden="true" /> Add item <span className="font-normal text-muted">({lines.length}/{MAX_LINES})</span>
          </Button>
        </Section>

        <Section icon={<Wallet />} title="Tax and payment">
          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Discount (₹, optional)" htmlFor="mi-discount" hint="Taken off the items total before GST.">
                <input id="mi-discount" name="discount" inputMode="decimal" maxLength={12} autoComplete="off" className={inputClass} placeholder="0" {...bind("discount")} />
              </Field>
              <div className="grid content-start gap-1.5">
                <p className="text-[13px] font-semibold">GST</p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="GST rate">
                  {gstOptions.map((p) => (
                    <Choice key={p} name="gstPercent" value={String(p)} checked={v.gstPercent === String(p)} onChange={() => setV((cur) => ({ ...cur, gstPercent: String(p) }))}>
                      {p}%
                    </Choice>
                  ))}
                </div>
                <p className="text-xs text-muted">Choose 0% if no GST applies.</p>
              </div>
            </div>

            <div className="grid gap-3">
              <p className="text-[13px] font-semibold">Payment</p>
              <input type="hidden" name="paid" value={payMode === "unpaid" ? "0" : (paid / 100).toFixed(2)} />
              <div className="flex flex-wrap gap-2">
                <Chip on={payMode === "unpaid"} onClick={() => setPayMode("unpaid")}>
                  Not paid yet
                </Chip>
                <Chip on={payMode === "part"} onClick={() => setPayMode("part")}>
                  Part paid
                </Chip>
                <Chip on={payMode === "full"} onClick={() => setPayMode("full")}>
                  Paid in full
                </Chip>
              </div>

              {payMode === "part" ? (
                <Field label="Amount paid (₹)" htmlFor="mi-paid" hint={total > 0 ? `Out of ${inr(total)}.` : "Add the items first."} className="max-w-xs">
                  <input id="mi-paid" inputMode="decimal" maxLength={12} autoComplete="off" className={inputClass} placeholder="e.g. 2000" value={v.paid} onChange={(e) => setV((cur) => ({ ...cur, paid: e.target.value }))} />
                </Field>
              ) : null}

              {payMode !== "unpaid" ? (
                <div className="grid gap-1.5">
                  <p className="text-[13px] font-semibold">Paid by</p>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Payment method">
                    {METHODS.map((m) => (
                      <Choice key={m.value} name="method" value={m.value} checked={v.method === m.value} onChange={() => setV((cur) => ({ ...cur, method: m.value }))}>
                        {m.label}
                      </Choice>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <Field label="Note on the invoice (optional)" htmlFor="mi-note" hint="Shown in the Balance box. Leave empty for the standard text.">
              <input id="mi-note" name="note" maxLength={200} autoComplete="off" className={inputClass} {...bind("note")} />
            </Field>
          </div>
        </Section>
      </div>

      {/* the figures stay in view next to the form on a laptop; on a phone they come last, right above the button */}
      <aside className="lg:sticky lg:top-6">
        <section className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-(family-name:--font-display) text-base font-bold">Invoice summary</h2>
            {status ? <Badge tone={status.tone}>{status.label}</Badge> : null}
          </div>

          <div className="mt-3 border-b border-line pb-3 text-sm">
            <p className="font-semibold wrap-anywhere">{v.gstCompany.trim() && wantGst ? v.gstCompany : v.name.trim() || "Customer name"}</p>
            <p className="text-xs text-muted">{v.date ? new Date(`${v.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "No date"}</p>
          </div>

          {filled.length > 0 ? (
            <ul className="grid gap-1.5 border-b border-line py-3 text-sm">
              {filled.map((line, index) => (
                <li key={index} className="flex items-start justify-between gap-3">
                  <span className="min-w-0 text-muted wrap-anywhere">{line.title.trim() || `Item ${index + 1}`}</span>
                  <span className="shrink-0 tabular-nums">{inr(toPaise(line.amount))}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-b border-line py-3 text-sm text-muted">Add items to see the bill here.</p>
          )}

          <dl className="grid gap-2 pt-3 text-sm tabular-nums">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Items total</dt>
              <dd>{inr(subtotal)}</dd>
            </div>
            {discount > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Discount</dt>
                <dd>- {inr(discount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-muted">GST @ {gstPercent}%</dt>
              <dd>{inr(gst)}</dd>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-line pt-3">
              <dt className="text-base font-bold">Total</dt>
              <dd className="font-(family-name:--font-display) text-2xl font-extrabold">{inr(total)}</dd>
            </div>
            {paid > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Paid</dt>
                <dd className="text-emerald-300">{inr(paid)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Balance due</dt>
              <dd className={cn("font-bold", balance > 0 ? "text-amber-300" : "text-emerald-300")}>{inr(balance)}</dd>
            </div>
          </dl>

          <div className="mt-4 grid gap-3">
            <FormMessage state={state} />
            <SubmitButton pendingText="Creating invoice..." disabled={!ready} className="w-full py-3">
              <FilePlus2 aria-hidden="true" /> Create invoice
            </SubmitButton>
            {!ready ? <p className="text-center text-xs text-muted">Enter the customer name and at least one item with an amount.</p> : null}
            <p className="text-center text-xs text-muted">The invoice number is given when you create it. The server works out every amount again.</p>
          </div>
        </section>
      </aside>
    </form>
  );
}
