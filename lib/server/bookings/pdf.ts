import "server-only";
import { rgb, type RGB } from "pdf-lib";
import { TRIP_TYPE_LABEL, describeMinutes, formatDate } from "@/lib/booking/config";
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
  vehiclePhotoFor,
  withPalette,
  type Tone,
} from "@/lib/server/bookings/pdf-kit";
import { loadCustomLogo } from "@/lib/server/bookings/custom-logo";
import { buildTicketPdf, type PdfContext } from "@/lib/server/bookings/ticket-pdf";
import { amountPaid, type BookingRow, type PaymentRow } from "@/lib/server/bookings/types";

export { buildTicketPdf };
export type { PdfContext };

type Item = { icon: string; title: string; detail?: string; amount: number };

const GREEN_BORDER = rgb(0.7, 0.88, 0.76);

export async function buildInvoicePdf(b: BookingRow, payments: PaymentRow[], ctx: PdfContext): Promise<Uint8Array> {
  const hex = accentHex(ctx.layout);
  return withPalette(hex ? paletteFrom(hex) : null, () => drawInvoice(b, payments, ctx));
}

async function drawInvoice(b: BookingRow, payments: PaymentRow[], ctx: PdfContext): Promise<Uint8Array> {
  const { site, rules, layout } = ctx;
  const cancelled = b.status === "cancelled";
  const paid = amountPaid(payments);
  const due = Math.max(0, b.total - paid);
  // payments still held, plus ones already refunded (shown so a cancelled booking's invoice is complete)
  const listed = payments.filter((p) => p.status === "paid" || p.status === "refunded");
  const received = listed.reduce((sum, p) => sum + p.amount, 0);

  const status: { label: string; tone: Tone; icon: string } = cancelled
    ? { label: "Cancelled", tone: "red", icon: "info" }
    : paid === 0
      ? { label: "Unpaid", tone: "amber", icon: "clock" }
      : due > 0
        ? { label: "Part paid", tone: "amber", icon: "layers" }
        : { label: "Paid", tone: "green", icon: "check" };

  const logo = await loadCustomLogo(layout.look.logoImage);
  const { canvas: c, assets } = await createDocument(
    `Invoice ${b.invoice_no}`,
    layout.look.showVehiclePhoto ? vehiclePhotoFor(b.vehicle_type) : null,
    logo,
  );
  drawFooter(c, assets, site, `Invoice: ${b.invoice_no}`, layout.footer);
  const bodyTop = drawHeader(c, assets, site, {
    layout: "row",
    title: layout.invoice.title || "TAX INVOICE",
    subtitle: layout.invoice.subtitle,
    icon: "file-text",
    status: layout.invoice.showStatus ? status : undefined,
    showContact: layout.look.showContact,
    showGstin: layout.look.showGstin,
  });

  /* ---------------- billed to + invoice details ---------------- */
  const metaTop = bodyTop - u(4);
  const metaH = u(214);
  const band = (x: number, top: number, w: number, h: number, icon: string, title: string) => {
    c.card(x, top, w, h);
    c.clipped(x, top, w, h, u(26), () => c.box(x, top, w, u(58), { fill: C.tint }));
    c.box(x, top, w, h, { stroke: C.cardBorder, radius: u(26), width: 0.9 });
    c.iconBadge(icon, x + u(30), top + u(10), u(38), { fill: C.blue, color: C.white });
    c.text(title, x + u(84), top + u(40), { size: fs(24), bold: true, color: C.navy, tracking: 0.4 });
  };

  const leftX = X(42);
  const leftW = u(471);
  band(leftX, metaTop, leftW, metaH, "user", "BILLED TO");
  const billed: [string, string, boolean][] = b.gstin
    ? [
        ["user", b.gst_company || b.traveller_name, true],
        ["file-text", `GSTIN ${b.gstin}`, false],
        ["phone", `${b.traveller_name} | +91 ${b.traveller_phone}`, false],
      ]
    : [
        ["user", b.traveller_name, true],
        ["mail", b.traveller_email, false],
        ["phone", `+91 ${b.traveller_phone}`, false],
      ];
  billed.forEach(([icon, value, bold], index) => {
    const centre = metaTop + u(96) + index * u(46);
    c.icon(icon, leftX + u(36), centre - u(13), u(26), C.navy, 1.9);
    let size = fs(bold ? 23 : 21);
    while (size > fs(12) && c.measure(value, size, bold) > leftW - u(100)) size -= 0.5;
    c.text(value, leftX + u(90), centre + u(7), { size, bold, color: C.ink });
  });

  const rightX = X(545);
  const rightW = u(468);
  band(rightX, metaTop, rightW, metaH, "clipboard-list", "INVOICE DETAILS");
  const details: [string, string][] = [
    ["Invoice Number", b.invoice_no],
    ["Invoice Date", istDate(b.confirmed_at ?? b.created_at)],
    ["Booking ID", b.ref],
  ];
  details.forEach(([label, value], index) => {
    const centre = metaTop + u(94) + index * u(45);
    c.text(label, rightX + u(34), centre + u(7), { size: fs(20), color: C.muted });
    c.text(value, rightX + u(206), centre + u(7), { size: fs(21), bold: true, color: C.ink });
    if (index < 2) c.rule(rightX + u(34), rightX + rightW - u(30), centre + u(26), C.cardBorder, 0.7);
  });

  /* ---------------- line items ---------------- */
  const items: Item[] = [
    {
      icon: "car",
      title: "Cab fare",
      detail: `${b.from_city} to ${b.to_city}  |  ${TRIP_TYPE_LABEL[b.trip_type]}  |  ${b.vehicle_type}  |  Travel date ${formatDate(b.travel_date)}`,
      amount: b.base_fare,
    },
    ...(b.addons_total > 0 ? [{ icon: "layers", title: `Special requests${b.addons ? ` (${b.addons})` : ""}`, amount: b.addons_total }] : []),
    ...(b.discount > 0 ? [{ icon: "layers", title: `Coupon discount${b.coupon_code ? ` (${b.coupon_code})` : ""}`, amount: -b.discount }] : []),
    { icon: "layers", title: `GST @ ${rules.gstPercent}%`, amount: b.gst },
    ...(b.service_fee > 0 ? [{ icon: "layers", title: "Service fee", amount: b.service_fee }] : []),
    ...(b.insurance > 0 ? [{ icon: "shield-check", title: "Trip protection (optional)", amount: b.insurance }] : []),
  ];
  // owner's terms / bank details: wrapped now so the spacing above can tighten when they share the page with payments
  const termSize = fs(17);
  const termLineH = u(22);
  const termWrapped = layout.invoice.terms
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => c.wrap(line, u(900), termSize));
  const compact = termWrapped.length > 0 && layout.invoice.showPayments;
  const gap = compact ? u(20) : u(30);

  const detailWidth = u(971) - u(300);
  const rowHeight = (item: Item) => (item.detail ? u(52) + c.wrap(item.detail, detailWidth, fs(17)).length * u(24) : u(66));
  const tableTop = metaTop + metaH + gap;
  const headerH = u(52);
  const tableH = headerH + items.reduce((sum, item) => sum + rowHeight(item), 0) + u(10);
  c.card(X(42), tableTop, u(971), tableH);
  c.clipped(X(42), tableTop, u(971), tableH, u(26), () => c.gradient(X(42), tableTop, u(971), headerH, C.blueMid, C.blueDeep));
  c.text("DESCRIPTION", X(78), tableTop + u(34), { size: fs(22), bold: true, color: C.white, tracking: 0.6 });
  c.text("AMOUNT", X(978), tableTop + u(34), { size: fs(22), bold: true, color: C.white, align: "right", tracking: 0.6 });
  let rowTop = tableTop + headerH;
  items.forEach((item, index) => {
    const h = rowHeight(item);
    const centre = rowTop + h / 2;
    c.box(X(76), centre - u(30), u(60), u(60), { fill: C.tintStrong, radius: u(14) });
    c.icon(item.icon, X(76) + u(15), centre - u(15), u(30), C.navy, 1.8);
    if (item.detail) {
      c.text(item.title, X(164), rowTop + u(36), { size: fs(23), bold: true, color: C.ink });
      c.paragraph(item.detail, X(164), rowTop + u(60), detailWidth, { size: fs(17), color: C.muted, lineHeight: u(24) });
      c.text(money(item.amount), X(978), rowTop + u(36), { size: fs(23), bold: true, color: C.ink, align: "right" });
    } else {
      c.text(item.title, X(164), centre + u(8), { size: fs(23), bold: true, color: C.ink });
      c.text(money(item.amount), X(978), centre + u(8), { size: fs(23), bold: true, color: C.ink, align: "right" });
    }
    if (index < items.length - 1) c.rule(X(76), X(980), rowTop + h, C.cardBorder, 0.7);
    rowTop += h;
  });

  /* ---------------- balance note + totals ---------------- */
  const sumTop = tableTop + tableH + gap;
  const sumH = u(186);

  c.card(X(44), sumTop + u(4), u(487), sumH - u(10));
  c.iconBadge("info", X(76), sumTop + u(26), u(36), { fill: C.blue, color: C.white });
  c.text("BALANCE", X(126), sumTop + u(54), { size: fs(23), bold: true, color: C.blueMid, tracking: 0.4 });
  const note = cancelled
    ? b.refund_amount > 0
      ? `This booking was cancelled. ${money(b.refund_amount)} has been refunded to the original payment method.`
      : "This booking was cancelled. No refund applies (it was too close to departure for a refund)."
    : due > 0
      ? `The balance can be paid online until ${describeMinutes(rules.balanceCutoffHours * 60)} before departure, or to the driver at the end of the trip.`
      : "This booking is fully paid. Thank you for choosing us!";
  c.paragraph(note, X(78), sumTop + u(98), u(400), { size: fs(18), color: C.muted, lineHeight: u(25) });

  const totX = X(561);
  const totW = u(452);
  c.card(totX, sumTop, totW, sumH);
  c.clipped(totX, sumTop, totW, sumH, u(26), () => c.gradient(totX, sumTop, totW, u(72), C.tintStrong, C.card));
  c.box(totX, sumTop, totW, sumH, { stroke: C.cardBorder, radius: u(26), width: 0.9 });
  c.text("TOTAL", totX + u(34), sumTop + u(48), { size: fs(24), bold: true, color: C.blueMid, tracking: 0.4 });
  c.text(money(b.total), totX + totW - u(34), sumTop + u(54), { size: fs(42), bold: true, color: C.navy, align: "right" });
  c.rule(totX + u(30), totX + totW - u(30), sumTop + u(74), C.cardBorder, 0.7);
  c.text("Amount paid", totX + u(34), sumTop + u(112), { size: fs(21), color: C.muted });
  c.text(money(cancelled ? received : paid), totX + totW - u(34), sumTop + u(112), { size: fs(23), bold: true, color: C.green, align: "right" });
  const barFill: RGB = cancelled ? C.blueBg : due > 0 ? C.amberBg : C.greenBg;
  const barText: RGB = cancelled ? C.blue : due > 0 ? C.amber : C.green;
  const barBorder: RGB = cancelled ? C.cardBorder : due > 0 ? C.amberBorder : GREEN_BORDER;
  c.box(totX + u(16), sumTop + u(126), totW - u(32), u(52), { fill: barFill, stroke: barBorder, radius: u(14), width: 0.9 });
  c.text(cancelled ? "Refunded" : "Balance due", totX + u(34), sumTop + u(160), { size: fs(21), color: C.ink });
  c.text(cancelled ? money(b.refund_amount) : money(due), totX + totW - u(34), sumTop + u(162), { size: fs(27), bold: true, color: barText, align: "right" });

  /* ---------------- payments received ---------------- */
  let contentEnd = sumTop + sumH;
  if (layout.invoice.showPayments) {
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
      c.text(p.paid_at ? istDate(p.paid_at) : "-", X(124), mid + u(7), { size: fs(20), color: C.muted });
      c.vrule(X(275), top + u(14), top + payRowH - u(14), C.cardBorder, 0.8);
      c.text(p.kind === "balance" ? "Balance payment" : p.kind === "full" ? "Full payment" : "Advance payment", X(306), mid + u(7), { size: fs(21), bold: true, color: C.ink });
      c.vrule(X(513), top + u(14), top + payRowH - u(14), C.cardBorder, 0.8);
      c.text(p.razorpay_payment_id ?? "", X(544), mid + u(7), { size: fs(18), color: C.muted });
      const refunded = p.status === "refunded";
      const label = refunded ? `${money(p.amount)}  refunded` : money(p.amount);
      const w = c.measure(label, fs(21), true) + u(44);
      c.box(X(984) - w, mid - u(19), w, u(38), { fill: refunded ? C.blueBg : C.greenBg, radius: u(19) });
      c.text(label, X(984) - w / 2, mid + u(7), { size: fs(21), bold: true, color: refunded ? C.blue : C.green, align: "center" });
    });
  }

  /* ---------------- terms / bank details (bottom of the page) ---------------- */
  // as many lines as fit between the content above and the footer; a cut-off is marked with "..."
  const termsBottom = u(1296);
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
