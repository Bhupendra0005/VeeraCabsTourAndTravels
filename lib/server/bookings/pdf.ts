import "server-only";
import { rgb, type RGB } from "pdf-lib";
import { TRIP_TYPE_LABEL, describeMinutes, formatDate } from "@/lib/booking/config";
import { chargeLine, chargeTerms } from "@/lib/booking/charges";
import type { QuotationRow } from "@/lib/server/quotations";
import { accentHex, paletteFrom } from "@/lib/booking/document-layout";
import {
  C,
  X,
  createDocument,
  drawFooter,
  drawHeader,
  fs,
  istDate,
  money,
  u,
  withPalette,
  type Canvas,
  type Tone,
} from "@/lib/server/bookings/pdf-kit";
import { loadCustomLogo } from "@/lib/server/bookings/custom-logo";
import { buildTicketPdf, type PdfContext } from "@/lib/server/bookings/ticket-pdf";
import { amountPaid, type BookingRow, type PaymentRow } from "@/lib/server/bookings/types";
import { PAYMENT_METHOD_LABEL, type ManualInvoiceRow } from "@/lib/server/invoices";

export { buildTicketPdf };
export type { PdfContext };

/** `amountText` replaces the rupee amount on the right (for a line that is a statement, not a charge). */
type Item = { icon: string; title: string; detail?: string; amount: number; amountText?: string };
type PaymentLine = { date: string; label: string; ref: string; amount: number; refunded: boolean };

/** Everything the invoice page shows. Built from a booking or from a hand-made invoice, drawn the same way. */
type InvoiceModel = {
  invoiceNo: string;
  status: { label: string; tone: Tone; icon: string };
  /** [icon, text, bold] rows in "Billed to" (3 or 4). */
  billed: [string, string, boolean][];
  /** [label, value] rows in "Invoice details" (3). */
  details: [string, string][];
  items: Item[];
  /** Text in the "Balance" card. */
  note: string;
  total: number;
  paidShown: number;
  bar: { label: string; amount: number; tone: "blue" | "amber" | "green" };
  payments: PaymentLine[];
  /** Set for a quotation: it is drawn like an invoice, without anything about money received. */
  quote?: { validUntil: string };
};

const GREEN_BORDER = rgb(0.7, 0.88, 0.76);

export async function buildInvoicePdf(b: BookingRow, payments: PaymentRow[], ctx: PdfContext): Promise<Uint8Array> {
  const hex = accentHex(ctx.layout);
  return withPalette(hex ? paletteFrom(hex) : null, () => renderInvoice(bookingModel(b, payments, ctx), ctx));
}

/** An invoice the owner typed by hand in Admin > Invoices. Same design as a booking invoice. */
export async function buildManualInvoicePdf(inv: ManualInvoiceRow, ctx: PdfContext): Promise<Uint8Array> {
  const hex = accentHex(ctx.layout);
  return withPalette(hex ? paletteFrom(hex) : null, () => renderInvoice(manualModel(inv), ctx));
}

/** A quotation (Admin > Invoices > Quotations). Same design as an invoice. */
export async function buildQuotationPdf(q: QuotationRow, ctx: PdfContext): Promise<Uint8Array> {
  const hex = accentHex(ctx.layout);
  return withPalette(hex ? paletteFrom(hex) : null, () => renderInvoice(quotationModel(q), ctx));
}

function quotationModel(q: QuotationRow): InvoiceModel {
  const percent = Number.isInteger(q.gst_percent) ? String(q.gst_percent) : q.gst_percent.toFixed(2).replace(/0+$/, "");
  const trip = `${q.from_city} to ${q.to_city}  |  ${TRIP_TYPE_LABEL[q.trip_type]}  |  ${q.vehicle_type}  |  ${q.passengers} passengers  |  Travel date ${formatDate(q.travel_date)}${q.return_date ? `  |  Return ${formatDate(q.return_date)}` : ""}`;
  return {
    invoiceNo: q.quote_no,
    status: { label: "Quotation", tone: "amber", icon: "file-text" },
    billed: [
      ["user", q.customer_name, true],
      ["phone", `+91 ${q.customer_phone}`, false],
      ["mail", q.customer_email || "-", false],
    ],
    details: [
      ["Quotation No.", q.quote_no],
      ["Date", istDate(q.quote_date)],
      ["Valid Until", q.valid_until ? istDate(q.valid_until) : "-"],
    ],
    items: [
      // the trip is written under the first line
      ...q.items.map((item, index) => ({ icon: "car", title: item.title, detail: [index === 0 ? trip : "", item.detail].filter(Boolean).join("  |  ") || undefined, amount: item.amount })),
      ...(q.discount > 0 ? [{ icon: "layers", title: "Discount", amount: -q.discount }] : []),
      ...(q.gst > 0 ? [{ icon: "layers", title: `GST @ ${percent}%`, amount: q.gst }] : []),
    ],
    note: q.note || "This is a price quotation, not a booking. Your cab is reserved once you confirm.",
    total: q.total,
    paidShown: 0,
    bar: { label: "Balance due", amount: q.total, tone: "blue" },
    payments: [],
    quote: { validUntil: q.valid_until ? istDate(q.valid_until) : "" },
  };
}

function bookingModel(b: BookingRow, payments: PaymentRow[], ctx: PdfContext): InvoiceModel {
  const { rules } = ctx;
  const cancelled = b.status === "cancelled";
  const paid = amountPaid(payments);
  const due = Math.max(0, b.total - paid);
  // payments still held, plus ones already refunded (shown so a cancelled booking's invoice is complete)
  const listed = payments.filter((p) => p.status === "paid" || p.status === "refunded");
  const received = listed.reduce((sum, p) => sum + p.amount, 0);

  const status: InvoiceModel["status"] = cancelled
    ? { label: "Cancelled", tone: "red", icon: "info" }
    : paid === 0
      ? { label: "Unpaid", tone: "amber", icon: "clock" }
      : due > 0
        ? { label: "Part paid", tone: "amber", icon: "layers" }
        : { label: "Paid", tone: "green", icon: "check" };

  const chargeTermsFor = chargeTerms(b.trip_type);
  const terms = chargeTermsFor ? chargeLine(chargeTermsFor) : null;

  return {
    invoiceNo: b.invoice_no,
    status,
    billed: b.gstin
      ? [
          ["user", b.gst_company || b.traveller_name, true],
          ["file-text", `GSTIN ${b.gstin}`, false],
          ["phone", `${b.traveller_name} | +91 ${b.traveller_phone}`, false],
        ]
      : [
          ["user", b.traveller_name, true],
          ["mail", b.traveller_email, false],
          ["phone", `+91 ${b.traveller_phone}`, false],
        ],
    details: [
      ["Invoice Number", b.invoice_no],
      ["Invoice Date", istDate(b.confirmed_at ?? b.created_at)],
      ["Booking ID", b.ref],
    ],
    items: [
      {
        icon: "car",
        title: "Cab fare",
        detail: `${b.from_city} to ${b.to_city}  |  ${TRIP_TYPE_LABEL[b.trip_type]}  |  ${b.vehicle_type}  |  Travel date ${formatDate(b.travel_date)}`,
        amount: b.base_fare,
      },
      ...(terms ? [{ icon: "layers", title: "Toll, parking & tax", detail: terms.detail, amount: 0, amountText: terms.label }] : []),
      ...(b.addons_total > 0 ? [{ icon: "layers", title: `Special requests${b.addons ? ` (${b.addons})` : ""}`, amount: b.addons_total }] : []),
      ...(b.discount > 0 ? [{ icon: "layers", title: `Coupon discount${b.coupon_code ? ` (${b.coupon_code})` : ""}`, amount: -b.discount }] : []),
      { icon: "layers", title: `GST @ ${rules.gstPercent}%`, amount: b.gst },
      ...(b.service_fee > 0 ? [{ icon: "layers", title: "Service fee", amount: b.service_fee }] : []),
      ...(b.insurance > 0 ? [{ icon: "shield-check", title: "Trip protection (optional)", amount: b.insurance }] : []),
    ],
    note: cancelled
      ? b.refund_amount > 0
        ? `This booking was cancelled. ${money(b.refund_amount)} has been refunded to the original payment method.`
        : "This booking was cancelled. No refund applies (it was too close to departure for a refund)."
      : due > 0
        ? `The balance can be paid online until ${describeMinutes(rules.balanceCutoffHours * 60)} before departure, or to the driver at the end of the trip.`
        : "This booking is fully paid. Thank you for choosing us!",
    total: b.total,
    paidShown: cancelled ? received : paid,
    bar: cancelled
      ? { label: "Refunded", amount: b.refund_amount, tone: "blue" }
      : { label: "Balance due", amount: due, tone: due > 0 ? "amber" : "green" },
    payments: listed.map((p) => ({
      date: p.paid_at ? istDate(p.paid_at) : "-",
      label: p.kind === "balance" ? "Balance payment" : p.kind === "full" ? "Full payment" : "Advance payment",
      ref: p.razorpay_payment_id ?? "",
      amount: p.amount,
      refunded: p.status === "refunded",
    })),
  };
}

function manualModel(inv: ManualInvoiceRow): InvoiceModel {
  const due = Math.max(0, inv.total - inv.amount_paid);
  const method = inv.payment_method ? PAYMENT_METHOD_LABEL[inv.payment_method] : "";
  const contact = [inv.customer_phone ? `+91 ${inv.customer_phone}` : "", inv.customer_email].filter(Boolean).join("  |  ");

  const billed: InvoiceModel["billed"] = inv.gstin
    ? [
        ["user", inv.gst_company || inv.customer_name, true],
        ["file-text", `GSTIN ${inv.gstin}`, false],
        ["phone", [inv.gst_company ? inv.customer_name : "", contact].filter(Boolean).join("  |  ") || "-", false],
      ]
    : [
        ["user", inv.customer_name, true],
        ["phone", inv.customer_phone ? `+91 ${inv.customer_phone}` : "-", false],
        ["mail", inv.customer_email || "-", false],
      ];
  if (inv.customer_address) billed.push(["map-pin", inv.customer_address, false]);

  const percent = Number.isInteger(inv.gst_percent) ? String(inv.gst_percent) : inv.gst_percent.toFixed(2).replace(/0+$/, "");
  return {
    invoiceNo: inv.invoice_no,
    status:
      inv.amount_paid === 0
        ? { label: "Unpaid", tone: "amber", icon: "clock" }
        : due > 0
          ? { label: "Part paid", tone: "amber", icon: "layers" }
          : { label: "Paid", tone: "green", icon: "check" },
    billed,
    details: [
      ["Invoice Number", inv.invoice_no],
      ["Invoice Date", istDate(inv.invoice_date)],
      ["Payment", method || (inv.amount_paid > 0 ? "Received" : "Pending")],
    ],
    items: [
      ...inv.items.map((item) => ({ icon: item.amountText ? "layers" : "car", title: item.title, detail: item.detail || undefined, amount: item.amount, amountText: item.amountText })),
      ...(inv.discount > 0 ? [{ icon: "layers", title: "Discount", amount: -inv.discount }] : []),
      ...(inv.gst > 0 ? [{ icon: "layers", title: `GST @ ${percent}%`, amount: inv.gst }] : []),
    ],
    note: inv.note || (due > 0 ? `A balance of ${money(due)} is still to be paid.` : "This invoice is fully paid. Thank you for choosing us!"),
    total: inv.total,
    paidShown: inv.amount_paid,
    bar: { label: "Balance due", amount: due, tone: due > 0 ? "amber" : "green" },
    payments:
      inv.amount_paid > 0
        ? [{ date: istDate(inv.invoice_date), label: due > 0 ? "Advance payment" : "Full payment", ref: method, amount: inv.amount_paid, refunded: false }]
        : [],
  };
}

/** Largest size (down to `min`) at which `text` fits `maxWidth`; cut with "..." if even that is too wide. */
function fitText(c: Canvas, text: string, maxWidth: number, start: number, min: number, bold: boolean): { text: string; size: number } {
  let size = start;
  while (size > min && c.measure(text, size, bold) > maxWidth) size -= 0.5;
  if (c.measure(text, size, bold) <= maxWidth) return { text, size };
  let cut = text.length;
  while (cut > 1 && c.measure(`${text.slice(0, cut).trimEnd()}...`, size, bold) > maxWidth) cut -= 1;
  return { text: `${text.slice(0, cut).trimEnd()}...`, size };
}

async function renderInvoice(m: InvoiceModel, ctx: PdfContext): Promise<Uint8Array> {
  const { site, layout } = ctx;

  const logo = await loadCustomLogo(layout.look.logoImage);
  // the invoice never shows the cab photo (the e-ticket still does, if switched on)
  const { canvas: c, assets } = await createDocument(`${m.quote ? "Quotation" : "Invoice"} ${m.invoiceNo}`, null, logo);
  drawFooter(c, assets, site, `${m.quote ? "Quotation" : "Invoice"}: ${m.invoiceNo}`, layout.footer);
  const showPayments = layout.invoice.showPayments && !m.quote;
  const bodyTop = drawHeader(c, assets, site, {
    layout: "row",
    title: m.quote ? "QUOTATION" : layout.invoice.title || "TAX INVOICE",
    subtitle: m.quote ? "Price estimate for your trip" : layout.invoice.subtitle,
    icon: "file-text",
    status: layout.invoice.showStatus ? m.status : undefined,
    showContact: layout.look.showContact,
    showGstin: layout.look.showGstin,
  });

  /* ---------------- billed to + invoice details ---------------- */
  const metaTop = bodyTop - u(4);
  const metaH = u(214) + Math.max(0, m.billed.length - 3) * u(46);
  const band = (x: number, top: number, w: number, h: number, icon: string, title: string) => {
    c.card(x, top, w, h);
    c.clipped(x, top, w, h, u(26), () => c.box(x, top, w, u(58), { fill: C.tint }));
    c.box(x, top, w, h, { stroke: C.cardBorder, radius: u(26), width: 0.9 });
    c.iconBadge(icon, x + u(30), top + u(10), u(38), { fill: C.blue, color: C.white });
    c.text(title, x + u(84), top + u(40), { size: fs(24), bold: true, color: C.navy, tracking: 0.4 });
  };

  const leftX = X(42);
  const leftW = u(471);
  band(leftX, metaTop, leftW, metaH, "user", m.quote ? "QUOTATION FOR" : "BILLED TO");
  m.billed.forEach(([icon, value, bold], index) => {
    const centre = metaTop + u(96) + index * u(46);
    c.icon(icon, leftX + u(36), centre - u(13), u(26), C.navy, 1.9);
    const fit = fitText(c, value, leftW - u(100), fs(bold ? 23 : 21), fs(12), bold);
    c.text(fit.text, leftX + u(90), centre + u(7), { size: fit.size, bold, color: C.ink });
  });

  const rightX = X(545);
  const rightW = u(468);
  band(rightX, metaTop, rightW, metaH, "clipboard-list", m.quote ? "QUOTATION DETAILS" : "INVOICE DETAILS");
  m.details.forEach(([label, value], index) => {
    const centre = metaTop + u(94) + index * u(45);
    c.text(label, rightX + u(34), centre + u(7), { size: fs(20), color: C.muted });
    const fit = fitText(c, value, rightW - u(240), fs(21), fs(14), true);
    c.text(fit.text, rightX + u(206), centre + u(7), { size: fit.size, bold: true, color: C.ink });
    if (index < m.details.length - 1) c.rule(rightX + u(34), rightX + rightW - u(30), centre + u(26), C.cardBorder, 0.7);
  });

  /* ---------------- line items ---------------- */
  const items = m.items;
  // owner's terms / bank details: wrapped now so the spacing above can tighten when they share the page with payments
  const termSize = fs(17);
  const termLineH = u(22);
  const termWrapped = layout.invoice.terms
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => c.wrap(line, u(900), termSize));
  const compact = termWrapped.length > 0 && showPayments;
  let gap = compact ? u(20) : u(30);

  const detailWidth = u(971) - u(300);
  const headerH = u(52);
  const sumH = u(186);
  const pageEnd = u(1296);
  // rows at full size; when they would push the totals into the footer (many lines on a hand-made invoice),
  // switch to tight rows (one detail line each) and, if still needed, squeeze them a little more
  const naturalH = (item: Item) => (item.detail ? u(52) + c.wrap(item.detail, detailWidth, fs(17)).length * u(24) : u(66));
  const tightH = (item: Item) => (item.detail ? u(56) : u(44));
  // the payments list at its smallest (rows of u(40)) also has to fit above the footer
  const payCount = Math.max(1, m.payments.length);
  const payMin = showPayments ? (compact ? u(62) : u(82)) + payCount * u(40) + (payCount - 1) * u(10) : 0;
  const chrome = (g: number) => metaTop + metaH + g + headerH + u(10) + g + sumH + payMin;
  let tight = false;
  let squeeze = 1;
  if (chrome(gap) + items.reduce((sum, item) => sum + naturalH(item), 0) > pageEnd) {
    tight = true;
    gap = u(16);
    const tightTotal = items.reduce((sum, item) => sum + tightH(item), 0);
    const room = pageEnd - chrome(gap);
    if (tightTotal > room) squeeze = Math.max(0.82, room / tightTotal);
  }
  const rowHeight = (item: Item) => (tight ? tightH(item) * squeeze : naturalH(item));
  const tableTop = metaTop + metaH + gap;
  const tableH = headerH + items.reduce((sum, item) => sum + rowHeight(item), 0) + u(10);
  c.card(X(42), tableTop, u(971), tableH);
  c.clipped(X(42), tableTop, u(971), tableH, u(26), () => c.gradient(X(42), tableTop, u(971), headerH, C.blueMid, C.blueDeep));
  c.text("DESCRIPTION", X(78), tableTop + u(34), { size: fs(22), bold: true, color: C.white, tracking: 0.6 });
  c.text("AMOUNT", X(978), tableTop + u(34), { size: fs(22), bold: true, color: C.white, align: "right", tracking: 0.6 });
  let rowTop = tableTop + headerH;
  items.forEach((item, index) => {
    const h = rowHeight(item);
    const centre = rowTop + h / 2;
    const title = fitText(c, item.title, detailWidth, fs(23), fs(16), true);
    if (tight) {
      c.box(X(80), centre - u(20), u(42), u(42), { fill: C.tintStrong, radius: u(11) });
      c.icon(item.icon, X(80) + u(10), centre - u(11), u(22), C.navy, 1.8);
      if (item.detail) {
        const detail = fitText(c, item.detail, detailWidth, fs(17), fs(15), false);
        c.text(title.text, X(164), centre - u(4), { size: title.size, bold: true, color: C.ink });
        c.text(detail.text, X(164), centre + u(19), { size: detail.size, color: C.muted });
        c.text(item.amountText ?? money(item.amount), X(978), centre - u(4), { size: item.amountText ? fs(19) : fs(23), bold: true, color: C.ink, align: "right" });
      } else {
        c.text(title.text, X(164), centre + u(8), { size: title.size, bold: true, color: C.ink });
        c.text(item.amountText ?? money(item.amount), X(978), centre + u(8), { size: item.amountText ? fs(19) : fs(23), bold: true, color: C.ink, align: "right" });
      }
      if (index < items.length - 1) c.rule(X(76), X(980), rowTop + h, C.cardBorder, 0.7);
      rowTop += h;
      return;
    }
    c.box(X(76), centre - u(30), u(60), u(60), { fill: C.tintStrong, radius: u(14) });
    c.icon(item.icon, X(76) + u(15), centre - u(15), u(30), C.navy, 1.8);
    if (item.detail) {
      c.text(title.text, X(164), rowTop + u(36), { size: title.size, bold: true, color: C.ink });
      c.paragraph(item.detail, X(164), rowTop + u(60), detailWidth, { size: fs(17), color: C.muted, lineHeight: u(24) });
      c.text(item.amountText ?? money(item.amount), X(978), rowTop + u(36), { size: item.amountText ? fs(19) : fs(23), bold: true, color: C.ink, align: "right" });
    } else {
      c.text(title.text, X(164), centre + u(8), { size: title.size, bold: true, color: C.ink });
      c.text(item.amountText ?? money(item.amount), X(978), centre + u(8), { size: item.amountText ? fs(19) : fs(23), bold: true, color: C.ink, align: "right" });
    }
    if (index < items.length - 1) c.rule(X(76), X(980), rowTop + h, C.cardBorder, 0.7);
    rowTop += h;
  });

  /* ---------------- balance note + totals ---------------- */
  const sumTop = tableTop + tableH + gap;

  c.card(X(44), sumTop + u(4), u(487), sumH - u(10));
  c.iconBadge("info", X(76), sumTop + u(26), u(36), { fill: C.blue, color: C.white });
  c.text(m.quote ? "NOTE" : "BALANCE", X(126), sumTop + u(54), { size: fs(23), bold: true, color: C.blueMid, tracking: 0.4 });
  c.paragraph(m.note, X(78), sumTop + u(98), u(400), { size: fs(18), color: C.muted, lineHeight: u(25) });

  const totX = X(561);
  const totW = u(452);
  c.card(totX, sumTop, totW, sumH);
  c.clipped(totX, sumTop, totW, sumH, u(26), () => c.gradient(totX, sumTop, totW, u(72), C.tintStrong, C.card));
  c.box(totX, sumTop, totW, sumH, { stroke: C.cardBorder, radius: u(26), width: 0.9 });
  c.text("TOTAL", totX + u(34), sumTop + u(48), { size: fs(24), bold: true, color: C.blueMid, tracking: 0.4 });
  c.text(money(m.total), totX + totW - u(34), sumTop + u(54), { size: fs(42), bold: true, color: C.navy, align: "right" });
  c.rule(totX + u(30), totX + totW - u(30), sumTop + u(74), C.cardBorder, 0.7);
  if (m.quote) {
    c.text("Including GST", totX + u(34), sumTop + u(112), { size: fs(21), color: C.muted });
    c.box(totX + u(16), sumTop + u(126), totW - u(32), u(52), { fill: C.blueBg, stroke: C.cardBorder, radius: u(14), width: 0.9 });
    c.text(m.quote.validUntil ? "Price valid until" : "Price quotation", totX + u(34), sumTop + u(160), { size: fs(21), color: C.ink });
    c.text(m.quote.validUntil, totX + totW - u(34), sumTop + u(161), { size: fs(23), bold: true, color: C.blue, align: "right" });
  } else {
    c.text("Amount paid", totX + u(34), sumTop + u(112), { size: fs(21), color: C.muted });
    c.text(money(m.paidShown), totX + totW - u(34), sumTop + u(112), { size: fs(23), bold: true, color: C.green, align: "right" });
    const barFill: RGB = m.bar.tone === "blue" ? C.blueBg : m.bar.tone === "amber" ? C.amberBg : C.greenBg;
    const barText: RGB = m.bar.tone === "blue" ? C.blue : m.bar.tone === "amber" ? C.amber : C.green;
    const barBorder: RGB = m.bar.tone === "blue" ? C.cardBorder : m.bar.tone === "amber" ? C.amberBorder : GREEN_BORDER;
    c.box(totX + u(16), sumTop + u(126), totW - u(32), u(52), { fill: barFill, stroke: barBorder, radius: u(14), width: 0.9 });
    c.text(m.bar.label, totX + u(34), sumTop + u(160), { size: fs(21), color: C.ink });
    c.text(money(m.bar.amount), totX + totW - u(34), sumTop + u(162), { size: fs(27), bold: true, color: barText, align: "right" });
  }

  /* ---------------- payments received ---------------- */
  let contentEnd = sumTop + sumH;
  // the list is left out when even its smallest form would run into the footer: "Amount paid" above already shows the money
  const payFits = sumTop + sumH + payMin <= pageEnd + u(4);
  if (showPayments && payFits) {
    const listed = m.payments;
    const payTop = sumTop + sumH + (compact ? u(16) : u(32));
    c.icon("credit-card", X(54), payTop - u(2), u(38), C.blue, 1.8);
    c.text("PAYMENTS RECEIVED", X(106), payTop + u(28), { size: fs(24), bold: true, color: C.navy, tracking: 0.4 });

    const listTop = payTop + (compact ? u(46) : u(50));
    const rowsAvailable = u(1300) - listTop;
    const count = Math.max(1, listed.length);
    const payRowH = compact ? u(40) : Math.max(u(40), Math.min(u(66), (rowsAvailable - (count - 1) * u(10)) / count));
    contentEnd = listTop + count * payRowH + (count - 1) * u(10);
    if (listed.length === 0) {
      c.card(X(44), listTop, u(970), payRowH, u(20));
      c.text("No payments received yet.", X(78), listTop + payRowH / 2 + u(7), { size: fs(20), color: C.muted });
    }
    listed.forEach((p, index) => {
      const top = listTop + index * (payRowH + u(10));
      const mid = top + payRowH / 2;
      c.card(X(44), top, u(970), payRowH, u(20));
      c.icon("calendar", X(76), mid - u(14), u(28), C.navy, 1.8);
      c.text(p.date, X(124), mid + u(7), { size: fs(20), color: C.muted });
      c.vrule(X(275), top + u(14), top + payRowH - u(14), C.cardBorder, 0.8);
      c.text(p.label, X(306), mid + u(7), { size: fs(21), bold: true, color: C.ink });
      c.vrule(X(513), top + u(14), top + payRowH - u(14), C.cardBorder, 0.8);
      c.text(p.ref, X(544), mid + u(7), { size: fs(18), color: C.muted });
      const label = p.refunded ? `${money(p.amount)}  refunded` : money(p.amount);
      const w = c.measure(label, fs(21), true) + u(44);
      c.box(X(984) - w, mid - u(19), w, u(38), { fill: p.refunded ? C.blueBg : C.greenBg, radius: u(19) });
      c.text(label, X(984) - w / 2, mid + u(7), { size: fs(21), bold: true, color: p.refunded ? C.blue : C.green, align: "center" });
    });
  }

  /* ---------------- terms / bank details (bottom of the page) ---------------- */
  // as many lines as fit between the content above and the footer; a cut-off is marked with "..."
  const termsBottom = pageEnd;
  const fitLines = Math.floor((termsBottom - (contentEnd + u(14)) - u(58)) / termLineH);
  if (termWrapped.length > 0 && fitLines >= 1) {
    const shown = termWrapped.slice(0, fitLines);
    if (shown.length < termWrapped.length) shown[shown.length - 1] = `${shown[shown.length - 1].replace(/[\s.,;:]+$/, "")}...`;
    const termsH = u(58) + shown.length * termLineH;
    const termsTop = termsBottom - termsH;
    c.card(X(44), termsTop, u(970), termsH, u(20));
    c.icon("info", X(70), termsTop + u(15), u(28), C.blue, 1.9);
    c.text("TERMS & NOTES", X(112), termsTop + u(36), { size: fs(21), bold: true, color: C.navy, tracking: 0.4 });
    shown.forEach((line, index) => {
      c.text(line, X(78), termsTop + u(70) + index * termLineH, { size: termSize, color: C.muted });
    });
  }

  return c.doc.save();
}
