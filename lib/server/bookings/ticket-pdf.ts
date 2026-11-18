import "server-only";
import { rgb, type RGB } from "pdf-lib";
import { TRIP_TYPE_LABEL, describeMinutes, formatDate, to12h, usableRefundSlabs } from "@/lib/booking/config";
import { accentHex, paletteFrom, type DocumentLayout } from "@/lib/booking/document-layout";
import type { BookingSettings } from "@/lib/booking/settings";
import { loadCustomLogo } from "@/lib/server/bookings/custom-logo";
import { C, Canvas, S, X, createDocument, drawFooter, drawHeader, fs, money, u, vehiclePhotoFor, withPalette } from "@/lib/server/bookings/pdf-kit";
import { amountPaid, type BookingRow, type PaymentRow } from "@/lib/server/bookings/types";
import type { SiteData } from "@/lib/site";

export type PdfContext = { rules: BookingSettings; site: SiteData; layout: DocumentLayout };

const STATUS: Record<string, { label: string; fill: RGB; icon: string }> = {
  confirmed: { label: "Confirmed", fill: rgb(0.08, 0.64, 0.29), icon: "check" },
  completed: { label: "Completed", fill: rgb(0.13, 0.4, 0.82), icon: "check" },
  cancelled: { label: "Cancelled", fill: rgb(0.8, 0.2, 0.18), icon: "info" },
  pending_payment: { label: "Payment pending", fill: rgb(0.85, 0.5, 0.06), icon: "clock" },
  payment_failed: { label: "Payment failed", fill: rgb(0.8, 0.2, 0.18), icon: "info" },
};


/** Largest size (down to `min`) at which `text` fits in `maxWidth`. */
function fit(c: Canvas, text: string, maxWidth: number, start: number, min: number): number {
  let size = start;
  while (size > min && c.measure(text, size, true) > maxWidth) size -= 1;
  return size;
}

export async function buildTicketPdf(b: BookingRow, payments: PaymentRow[], ctx: PdfContext): Promise<Uint8Array> {
  const hex = accentHex(ctx.layout);
  return withPalette(hex ? paletteFrom(hex) : null, () => drawTicket(b, payments, ctx));
}

const NOTE_ICONS = ["calendar-check", "shield-check", "wallet", "id-card"];

async function drawTicket(b: BookingRow, payments: PaymentRow[], ctx: PdfContext): Promise<Uint8Array> {
  const { site, rules, layout } = ctx;
  const paid = amountPaid(payments);
  const due = Math.max(0, b.total - paid);
  const cancelled = b.status === "cancelled";
  const status = STATUS[b.status] ?? STATUS.pending_payment;

  const logo = await loadCustomLogo(layout.look.logoImage);
  const { canvas: c, assets } = await createDocument(
    `E-Ticket ${b.ref}`,
    layout.look.showVehiclePhoto ? vehiclePhotoFor(b.vehicle_type) : null,
    logo,
  );
  drawFooter(c, assets, site, `Booking ID: ${b.ref}`, layout.footer);
  drawHeader(c, assets, site, {
    layout: "inline",
    title: layout.ticket.title || "E-TICKET",
    subtitle: cancelled ? "This booking has been cancelled" : layout.ticket.subtitle,
    icon: "ticket",
    showContact: layout.look.showContact,
    showGstin: layout.look.showGstin,
  });

  /* ---------------- route card ---------------- */
  const rcX = X(40);
  const rcTop = u(288);
  const rcW = u(975);
  const rcH = u(234);
  c.gradient(rcX, rcTop, rcW, rcH, C.routeA, C.routeB, { radius: u(30) });
  c.text("YOUR ROUTE", X(76), u(324), { size: fs(17), bold: true, color: C.white, tracking: 1.1 });

  // status badge, hanging over the card's top edge
  const badge = u(46);
  const label = status.label.toUpperCase();
  const badgeText = u(20);
  const badgeW = c.measure(label, badgeText, true, 0.4) + u(86);
  c.box(X(1000) - badgeW, u(270), badgeW, badge, { fill: status.fill, stroke: C.white, radius: badge / 2, width: 1.4 });
  c.icon(status.icon, X(1000) - badgeW + u(20), u(270) + u(9), u(28), C.white, 2.8);
  c.text(label, X(1000) - badgeW + u(58), u(270) + badge / 2 + badgeText * 0.34, { size: badgeText, bold: true, color: C.white, tracking: 0.4 });

  // cities: one big line when it fits, otherwise wrapped onto 2-3 smaller lines
  const city = (name: string, x: number, maxWidth: number) => {
    const single = fit(c, name, maxWidth, fs(46), fs(34));
    if (c.measure(name, single, true) <= maxWidth) {
      c.text(name, x, u(380), { size: single, bold: true, color: C.white });
      return;
    }
    let size = fs(30);
    while (size > fs(19) && c.wrap(name, maxWidth, size, true).length > 2) size -= 0.5;
    const lines = c.wrap(name, maxWidth, size, true);
    const step = size * 1.12;
    const first = u(368) - ((lines.length - 1) * step) / 2 + (lines.length > 1 ? u(8) : 0);
    lines.forEach((line, index) => c.text(line, x, first + index * step, { size, bold: true, color: C.white }));
  };
  // the middle (x 372..628) belongs to the trip-type pill and arrow, so each city keeps to its own side of it
  c.icon("map-pin", X(76), u(342), u(38), C.white, 2.2);
  city(b.from_city, X(122), u(240));
  c.icon("map-pin", X(650), u(342), u(38), C.white, 2.2);
  city(b.to_city, X(696), u(300));

  // trip type pill + arrow
  const tripLabel = TRIP_TYPE_LABEL[b.trip_type].toUpperCase();
  const pillW = c.measure(tripLabel, u(16), true, 0.8) + u(40);
  c.box(X(500) - pillW / 2, u(342), pillW, u(30), { fill: C.white, radius: u(15) });
  c.text(tripLabel, X(500), u(342) + u(21), { size: fs(16), bold: true, color: C.blueDeep, align: "center", tracking: 0.8 });
  c.rule(X(392), X(606), u(392), C.white, 1.8);
  c.path("M 0 -7 L 13 0 L 0 7 Z", X(602), u(392), S * 1.05, { fill: C.white });

  // divider + four key facts
  c.rule(X(60), X(992), u(430), C.white, 0.7, 0.3);
  const facts: [string, string, string, number][] = [
    ["calendar", "PICKUP DATE", formatDate(b.travel_date), 84],
    ["clock", "PICKUP TIME", to12h(b.travel_time), 356],
    ["car", "VEHICLE", b.vehicle_type, 566],
    ["users", "PASSENGERS", String(b.passengers), 818],
  ];
  facts.forEach(([icon, name, value, x], index) => {
    c.icon(icon, X(x), u(455), u(38), C.white, 1.8);
    c.text(name, X(x + 50), u(468), { size: fs(14), bold: true, color: C.routeText, tracking: 0.6 });
    const room = (index === 3 ? 195 : index === 2 ? 205 : 195) - 0;
    c.text(value, X(x + 50), u(494), { size: fit(c, value, u(room), fs(21), fs(13)), bold: true, color: C.white });
    if (index > 0) c.vrule(X(x - 22), u(446), u(508), C.white, 0.7, 0.3);
  });

  /* ---------------- trip details + QR ---------------- */
  const addrWidth = u(445);
  const lineGap = (size: number) => size * 1.2;
  const budget = u(352); // the tallest the card can be before it would run into the footer
  const needFor = (size: number) => {
    let need = u(78);
    const blocks = [b.pickup_address, ...(b.drop_address ? [b.drop_address] : []), ...(b.return_date ? [formatDate(b.return_date)] : [])];
    blocks.forEach((text, index) => {
      if (index > 0) need += u(14);
      need += u(42) + c.wrap(text, addrWidth, size, index === 0).length * lineGap(size) + u(6);
    });
    return need + u(18);
  };
  let addrSize = fs(20);
  while (addrSize > fs(15) && needFor(addrSize) > budget) addrSize -= 0.5;

  const LEFT_W = u(557); // left column: x 40..597
  const RIGHT_X = X(615); // right column: x 615..1015 (right edges line up with the route card)
  const RIGHT_W = u(400);

  const row1Top = u(544);
  const row1H = Math.max(u(322), needFor(addrSize));

  c.card(X(40), row1Top, LEFT_W, row1H);
  c.iconBadge("map-pin", X(74), row1Top + u(20), u(40), { fill: C.blue, color: C.white });
  c.text("TRIP DETAILS", X(126), row1Top + u(48), { size: fs(25), bold: true, color: C.navy, tracking: 0.3 });
  c.rule(X(70), X(566), row1Top + u(70), C.cardBorder, 0.7);

  let y = row1Top + u(84);
  const block = (icon: string, labelText: string, value: string, bold = true) => {
    c.icon(icon, X(78), y + u(14), u(30), C.navy, 2);
    c.text(labelText, X(128), y + u(16), { size: fs(14), bold: true, color: C.muted, tracking: 1.2 });
    y = c.paragraph(value, X(128), y + u(42), addrWidth, { size: addrSize, bold, color: C.ink, lineHeight: lineGap(addrSize) });
    y += u(6);
  };
  block("map-pin", "PICKUP ADDRESS", b.pickup_address);
  if (b.drop_address) {
    c.rule(X(70), X(566), y, C.cardBorder, 0.8);
    y += u(14);
    block("map-pin", "DROP ADDRESS", b.drop_address, false);
  }
  if (b.return_date) {
    c.rule(X(70), X(566), y, C.cardBorder, 0.8);
    y += u(14);
    block("calendar", "RETURN DATE", formatDate(b.return_date), false);
  }

  // the booking ID takes the whole card
  c.card(RIGHT_X, row1Top, RIGHT_W, row1H);
  const midX = RIGHT_X + RIGHT_W / 2;
  const midY = row1Top + row1H / 2;
  c.icon("ticket", midX - u(30), midY - u(110), u(60), C.blue, 1.7);
  c.text("BOOKING ID", midX, midY - u(10), { size: fs(15), bold: true, color: C.muted, align: "center", tracking: 1.3 });
  const refSize = fit(c, b.ref, u(300), fs(34), fs(16));
  const refW = c.measure(b.ref, refSize, true) + u(60);
  c.box(midX - refW / 2, midY + u(4), refW, u(56), { fill: C.tintStrong, radius: u(28) });
  c.text(b.ref, midX, midY + u(4) + u(56) / 2 + refSize * 0.35, { size: refSize, bold: true, color: C.navy, align: "center" });
  c.text("Show this at pickup", midX, midY + u(96), { size: fs(17), color: C.muted, align: "center" });

  /* ---------------- traveller + payment ---------------- */
  const row2Top = row1Top + row1H + u(18);
  const row2H = u(228);

  c.card(X(40), row2Top, LEFT_W, row2H);
  c.iconBadge("user", X(72), row2Top + u(18), u(40), { fill: C.blue, color: C.white });
  c.text("TRAVELLER", X(124), row2Top + u(46), { size: fs(25), bold: true, color: C.navy, tracking: 0.3 });
  c.rule(X(70), X(566), row2Top + u(68), C.cardBorder, 0.7);
  const people: [string, string, string, boolean][] = [
    ["user", "NAME", b.traveller_name, true],
    ["phone", "MOBILE", `+91 ${b.traveller_phone}`, false],
    ["mail", "EMAIL", b.traveller_email, false],
  ];
  people.forEach(([icon, name, value, bold], index) => {
    const rowTop = row2Top + u(80) + index * u(48);
    c.iconBadge(icon, X(70), rowTop + u(2), u(38), { fill: C.card, stroke: C.cardBorder, color: C.navy, weight: 1.8 });
    c.text(name, X(126), rowTop + u(13), { size: fs(12.5), bold: true, color: C.muted, tracking: 1.1 });
    c.text(value, X(126), rowTop + u(36), { size: fit(c, value, u(440), fs(20), fs(11)), bold, color: C.ink });
    if (index < 2) c.rule(X(126), X(566), rowTop + u(46), C.cardBorder, 0.7);
  });

  c.card(RIGHT_X, row2Top, RIGHT_W, row2H);
  c.iconBadge("credit-card", RIGHT_X + u(28), row2Top + u(18), u(40), { fill: C.blue, color: C.white });
  c.text("PAYMENT", RIGHT_X + u(80), row2Top + u(46), { size: fs(25), bold: true, color: C.navy, tracking: 0.3 });
  c.rule(RIGHT_X + u(24), RIGHT_X + RIGHT_W - u(24), row2Top + u(68), C.cardBorder, 0.7);
  const lines: [string, string, string, RGB, boolean][] = [
    ["wallet", "Total fare", money(b.total), C.ink, true],
    ["credit-card", "Paid online", money(paid), C.green, true],
  ];
  lines.forEach(([icon, name, value, color, bold], index) => {
    const centre = row2Top + u(98) + index * u(40);
    c.icon(icon, RIGHT_X + u(30), centre - u(12), u(24), C.muted, 1.8);
    c.text(name, RIGHT_X + u(68), centre + u(6), { size: fs(19), color: C.ink });
    c.text(value, RIGHT_X + RIGHT_W - u(28), centre + u(6), { size: fs(21), bold, color, align: "right" });
    if (index === 0) c.rule(RIGHT_X + u(24), RIGHT_X + RIGHT_W - u(24), centre + u(20), C.cardBorder, 0.7);
  });
  const balTop = row2Top + u(160);
  const showRefund = cancelled;
  c.box(RIGHT_X + u(16), balTop, RIGHT_W - u(32), u(50), { fill: showRefund ? C.blueBg : C.amberBg, stroke: showRefund ? C.cardBorder : C.amberBorder, radius: u(14), width: 0.9 });
  c.icon("wallet", RIGHT_X + u(30), balTop + u(13), u(24), showRefund ? C.blue : C.amber, 1.8);
  c.text(showRefund ? "Refunded" : "Balance to pay", RIGHT_X + u(68), balTop + u(32), { size: fs(19), color: C.ink });
  c.text(showRefund ? money(b.refund_amount) : money(due), RIGHT_X + RIGHT_W - u(28), balTop + u(33), {
    size: fs(23),
    bold: true,
    color: showRefund ? C.blue : due > 0 ? C.amber : C.green,
    align: "right",
  });

  /* ---------------- good to know ---------------- */
  const gtkTop = row2Top + row2H + u(18);
  // with partial-refund steps the "100% penalty after that" note would be wrong, so it tells the steps instead
  const steps = usableRefundSlabs(rules.freeCancelMinutes, rules.refundSlabs);
  const afterFree = steps.length
    ? `After that: ${steps.map((step) => `${step.percent}% refund up to ${describeMinutes(step.minutes)}`).join(", ")} before departure, then none.`
    : "After that a 100% penalty applies and no refund is given.";
  const fill = (text: string) =>
    (steps.length && text.trim() === "After that a 100% penalty applies and no refund is given." ? afterFree : text)
      .replaceAll("{afterFree}", afterFree)
      .replaceAll("{freeCancel}", describeMinutes(rules.freeCancelMinutes))
      .replaceAll("{balanceCutoff}", describeMinutes(rules.balanceCutoffHours * 60));
  let notes = layout.ticket.notes.map(fill).filter(Boolean);
  if (b.driver_name || b.driver_phone || b.cab_number) {
    // the driver is known: say so (first, so it is never cut off) and drop the "shared before pickup" sentence
    const driverNote = [b.driver_name && `Driver: ${b.driver_name}`, b.driver_phone && `+91 ${b.driver_phone}`, b.cab_number && `Cab: ${b.cab_number}`, b.cab_model].filter(Boolean).join(" · ");
    notes = [driverNote, ...notes.map((text) => text.replace(/\s*Driver details are shared before pickup\.?/i, "").trim()).filter(Boolean)];
  }
  notes = notes.slice(0, 4);
  if (layout.ticket.showNotes && notes.length > 0) {
    const count = notes.length;
    const area = 925; // usable width inside the box, in design units
    const colWidth = area / count;
    const colText = colWidth - 68;
    const noteSize = fs(16);
    const maxLines = Math.max(...notes.map((text) => c.wrap(text, u(colText), noteSize).length));
    const gtkH = u(Math.max(150, 84 + (maxLines - 1) * 21 + 28));
    c.box(X(40), gtkTop, u(975), gtkH, { fill: rgb(1, 0.973, 0.89), stroke: C.amberBorder, radius: u(24), width: 0.9 });
    c.gradient(X(40) + 1, gtkTop + 1, u(975) - 2, gtkH - 2, rgb(1, 0.98, 0.91), rgb(0.995, 0.93, 0.76), { radius: u(23), horizontal: true });
    c.iconBadge("info", X(66), gtkTop + u(18), u(36), { fill: rgb(0.96, 0.62, 0.04), color: C.white });
    c.text("GOOD TO KNOW", X(116), gtkTop + u(44), { size: fs(24), bold: true, color: rgb(0.57, 0.27, 0.06), tracking: 0.3 });
    notes.forEach((text, index) => {
      const x = 66 + index * colWidth;
      c.icon(NOTE_ICONS[index % NOTE_ICONS.length], X(x), gtkTop + u(70), u(38), rgb(0.7, 0.4, 0.05), 1.8);
      c.paragraph(text, X(x + 48), gtkTop + u(86), u(colText), { size: noteSize, color: C.ink, lineHeight: u(21) });
      if (index > 0) c.vrule(X(x - 18), gtkTop + u(66), gtkTop + gtkH - u(20), C.amberBorder, 0.8);
    });
  }

  return c.doc.save();
}
