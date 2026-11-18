import "server-only";
import { TRIP_TYPE_LABEL, describeMinutes, formatDate, formatINR, to12h } from "@/lib/booking/config";
import type { BookingSettings } from "@/lib/booking/settings";
import type { BookingRow } from "@/lib/server/bookings/types";
import { esc } from "@/lib/server/email/brevo";
import type { SiteData } from "@/lib/site";

const FONT = "'Segoe UI',Helvetica,Arial,sans-serif";

type Badge = { text: string; color: string; bg: string };

/** Shared frame: dark header with a brand-blue line, a status chip, the title, the body and a footer. Tables and inline styles only, so it holds up in Gmail, Outlook and phones. */
function layout(site: SiteData, title: string, body: string, opts: { badge?: Badge; preheader?: string } = {}): string {
  const badge = opts.badge
    ? `<span style="display:inline-block;margin:0 0 12px;padding:5px 12px;border-radius:999px;background:${opts.badge.bg};color:${opts.badge.color};font-size:12px;font-weight:700;letter-spacing:.4px;text-transform:uppercase">${esc(opts.badge.text)}</span>`
    : "";
  const pre = opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(opts.preheader)}</div>` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#eef3f6;font-family:${FONT};color:#10181c">${pre}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f6"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dde6ec">
<tr><td style="background:#0a0c0c;padding:20px 28px;border-bottom:4px solid #0096db"><span style="font-size:19px;font-weight:700;color:#ffffff;letter-spacing:.2px">${esc(site.name)}</span></td></tr>
<tr><td style="padding:28px 28px 8px">${badge}<h1 style="margin:0;font-size:24px;line-height:30px;font-weight:700;color:#10181c">${esc(title)}</h1></td></tr>
<tr><td style="padding:8px 28px 28px;font-size:15px;line-height:23px;color:#26343b">${body}</td></tr>
<tr><td style="padding:18px 28px;background:#f7fafc;border-top:1px solid #e6edf1;font-size:12px;line-height:18px;color:#5b676d;text-align:center">
<strong style="color:#26343b">${esc(site.name)}</strong><br>${esc(site.address.full)}<br>${esc(site.primaryPhone.display)} &middot; ${esc(site.email)}</td></tr>
</table></td></tr></table></body></html>`;
}

/** A soft box with a small caps heading, for grouping rows (trip, payment, driver). */
function card(heading: string, inner: string, tone: "plain" | "blue" = "plain"): string {
  const bg = tone === "blue" ? "#eef6fb" : "#f7fafc";
  const line = tone === "blue" ? "#cfe3f1" : "#e3ebf0";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;background:${bg};border:1px solid ${line};border-radius:12px"><tr><td style="padding:14px 18px 6px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#5b676d">${esc(heading)}</td></tr><tr><td style="padding:0 18px 10px">${inner}</td></tr></table>`;
}

/** Label / value rows with a thin divider between them. */
function rowsTable(rows: [string, string][], strong = false): string {
  const body = rows
    .map(
      ([k, v], i) =>
        `<tr><td style="padding:9px 12px 9px 0;${i ? "border-top:1px solid #e3ebf0;" : ""}color:#5b676d;font-size:14px;width:130px;vertical-align:top">${esc(k)}</td><td style="padding:9px 0;${i ? "border-top:1px solid #e3ebf0;" : ""}font-size:14px;font-weight:${strong ? 700 : 600};color:#10181c;vertical-align:top">${esc(v)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table>`;
}

/** The booking ID and the From -> To line, shown first. */
function routeHeader(b: BookingRow): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;border:1px solid #dde6ec;border-radius:12px">
<tr><td style="padding:14px 18px 0;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#5b676d">Booking ID</td></tr>
<tr><td style="padding:2px 18px 12px;font-family:'Courier New',Consolas,monospace;font-size:22px;font-weight:700;letter-spacing:2px;color:#04567f">${esc(b.ref)}</td></tr>
<tr><td style="padding:0 18px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f8fc;border-radius:10px"><tr>
<td style="padding:12px 14px;width:44%"><div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#5b676d">From</div><div style="margin-top:2px;font-size:17px;font-weight:700;color:#10181c">${esc(b.from_city)}</div></td>
<td align="center" style="font-size:20px;color:#0096db;font-weight:700">&rarr;</td>
<td align="right" style="padding:12px 14px;width:44%"><div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#5b676d">To</div><div style="margin-top:2px;font-size:17px;font-weight:700;color:#10181c">${esc(b.to_city)}</div></td>
</tr></table></td></tr></table>`;
}

export function otpEmail(site: SiteData, code: string) {
  const font = "'Segoe UI',Helvetica,Arial,sans-serif";
  const preheader = `${code} is your ${site.shortName} login code. Valid for 10 minutes.`;
  return {
    subject: `${code} is your ${site.shortName} login code`,
    text: `Your ${site.shortName} login code is ${code}. It is valid for 10 minutes. Never share this code with anyone. If you did not request it, ignore this email.`,
    html: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#eef3f6;font-family:${font};color:#10181c">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f6"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dde6ec">
<tr><td style="background:#0a0c0c;padding:22px 28px;border-bottom:4px solid #0096db">
<span style="font-size:19px;font-weight:700;color:#ffffff;letter-spacing:.2px">${esc(site.name)}</span></td></tr>
<tr><td style="padding:32px 28px 8px;text-align:center">
<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#10181c">Verify your sign-in</h1>
<p style="margin:0;font-size:15px;line-height:22px;color:#4a5a63">Enter this code to continue to your account.</p></td></tr>
<tr><td style="padding:20px 28px" align="center">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#f2f8fc;border:2px dashed #0096db;border-radius:12px;padding:16px 28px;text-align:center">
<span style="font-family:'Courier New',Consolas,monospace;font-size:36px;line-height:44px;font-weight:700;letter-spacing:10px;color:#04567f;padding-left:10px">${esc(code)}</span></td></tr></table>
<p style="margin:14px 0 0;font-size:13px;color:#5b676d">This code expires in <strong style="color:#10181c">10 minutes</strong>.</p></td></tr>
<tr><td style="padding:4px 28px 28px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e6;border-radius:10px"><tr><td style="padding:12px 14px;font-size:13px;line-height:19px;color:#6b5314">
<strong>Never share this code</strong> with anyone. ${esc(site.shortName)} will never ask for it by phone, chat or email.</td></tr></table>
<p style="margin:16px 0 0;font-size:13px;line-height:19px;color:#5b676d;text-align:center">Didn&rsquo;t request this? You can safely ignore this email &mdash; your account is untouched.</p></td></tr>
<tr><td style="padding:18px 28px;background:#f7fafc;border-top:1px solid #e6edf1;font-size:12px;line-height:18px;color:#5b676d;text-align:center">
${esc(site.address.full)}<br>${esc(site.primaryPhone.display)} &middot; ${esc(site.email)}</td></tr>
</table></td></tr></table></body></html>`,
  };
}

function tripData(b: BookingRow): [string, string][] {
  const rows: [string, string][] = [
    ["Trip", `${b.from_city} to ${b.to_city} (${TRIP_TYPE_LABEL[b.trip_type]})`],
    ["Pickup", b.pickup_address],
    ["Date & time", `${formatDate(b.travel_date)}, ${to12h(b.travel_time)}`],
    ["Vehicle", b.vehicle_type],
    ["Passengers", String(b.passengers)],
    ["Traveller", `${b.traveller_name} (+91 ${b.traveller_phone})`],
  ];
  if (b.return_date) rows.splice(3, 0, ["Return date", formatDate(b.return_date)]);
  return rows.filter(([, v]) => v && v.trim());
}

/** Booking ID, route and trip details, for emails that only need the facts of the trip. */
function tripBlock(b: BookingRow): string {
  return routeHeader(b) + card("Trip details", rowsTable(tripData(b)));
}

/** The driver and cab rows, empty until the owner has assigned them. */
export function hasDriver(b: BookingRow): boolean {
  return !!(b.driver_name || b.driver_phone || b.cab_number);
}

function driverData(b: BookingRow): [string, string][] {
  const rows: [string, string][] = [];
  if (b.driver_name) rows.push(["Driver", b.driver_name]);
  if (b.driver_phone) rows.push(["Driver phone", `+91 ${b.driver_phone}`]);
  if (b.cab_number) rows.push(["Cab number", b.cab_number]);
  if (b.cab_model) rows.push(["Cab", b.cab_model]);
  return rows;
}

/**
 * The driver and cab as a proper card: initial in a circle, name and number, a "Call driver" button, and the cab number as a
 * number plate. The phone is a styled link so Gmail does not turn it into a plain blue underlined one.
 */
function driverCard(b: BookingRow): string {
  const name = b.driver_name || "Your driver";
  const phone = b.driver_phone
    ? `<a href="tel:+91${esc(b.driver_phone)}" style="color:#04567f;text-decoration:none;font-size:15px;font-weight:600">+91 ${esc(b.driver_phone)}</a>`
    : "";
  const call = b.driver_phone
    ? `<a href="tel:+91${esc(b.driver_phone)}" style="display:inline-block;padding:10px 18px;border-radius:10px;background:#0096db;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">Call driver</a>`
    : "";
  const plate = b.cab_number
    ? `<span style="display:inline-block;padding:7px 14px;border:2px solid #10181c;border-radius:8px;background:#fde68a;color:#10181c;font-family:'Courier New',Consolas,monospace;font-size:18px;font-weight:700;letter-spacing:2px">${esc(b.cab_number)}</span>`
    : "";
  const cab = b.cab_model ? `<div style="margin-top:8px;font-size:14px;color:#26343b">${esc(b.cab_model)}</div>` : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;background:#eef6fb;border:1px solid #cfe3f1;border-radius:12px">
<tr><td style="padding:14px 18px 4px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#5b676d">Your driver and cab</td></tr>
<tr><td style="padding:6px 18px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="56" valign="middle"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" width="48" height="48" style="width:48px;height:48px;border-radius:24px;background:#0096db;color:#ffffff;font-size:20px;font-weight:700">${esc(name.charAt(0).toUpperCase())}</td></tr></table></td>
<td valign="middle"><div style="font-size:18px;font-weight:700;color:#10181c">${esc(name)}</div>${phone ? `<div style="margin-top:2px">${phone}</div>` : ""}</td>
</tr></table></td></tr>
${call ? `<tr><td style="padding:10px 18px 4px">${call}</td></tr>` : ""}
${plate || cab ? `<tr><td style="padding:12px 18px 16px;border-top:1px solid #cfe3f1"><div style="margin:12px 0 8px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#5b676d">Cab</div>${plate}${cab}</td></tr>` : `<tr><td style="padding:0 18px 12px"></td></tr>`}
</table>`;
}

/** Sent when the owner assigns (or changes) the driver and cab. */
export function driverAssignedEmail(site: SiteData, b: BookingRow) {
  const line = [b.driver_name && `Driver ${b.driver_name}`, b.driver_phone && `+91 ${b.driver_phone}`, b.cab_number && `Cab ${b.cab_number}`].filter(Boolean).join(", ");
  return {
    subject: `Your driver and cab for booking ${b.ref}`,
    text: `Your driver and cab for booking ${b.ref} (${b.from_city} to ${b.to_city}, ${formatDate(b.travel_date)} at ${to12h(b.travel_time)}): ${line}.`,
    html: layout(
      site,
      "Your driver and cab are assigned",
      `<p style="margin:0">Hi ${esc(b.traveller_name)}, here are the details for your trip on <strong>${esc(formatDate(b.travel_date))}</strong> at <strong>${esc(to12h(b.travel_time))}</strong>.</p>
${driverCard(b)}
${tripBlock(b)}
<p style="margin:18px 0 0;font-size:13px;line-height:20px;color:#5b676d">Please keep your phone reachable around pickup time. You can also see these details any time under My trips on our website.</p>`,
      { badge: { text: "Driver assigned", color: "#04567f", bg: "#e3f2fb" }, preheader: `Driver and cab for booking ${b.ref}` },
    ),
  };
}

export function confirmationEmail(site: SiteData, rules: BookingSettings, b: BookingRow, paid: number) {
  const due = Math.max(0, b.total - paid);
  const payRows: [string, string][] = [
    ["Total fare", formatINR(b.total)],
    ["Paid", formatINR(paid)],
  ];
  const balanceRow =
    due > 0
      ? `<tr><td style="padding:12px 0 4px;border-top:2px solid #cfe3f1;font-size:14px;color:#5b676d">Balance to pay</td><td align="right" style="padding:12px 0 4px;border-top:2px solid #cfe3f1;font-size:20px;font-weight:700;color:#b45309">${esc(formatINR(due))}</td></tr>`
      : `<tr><td style="padding:12px 0 4px;border-top:2px solid #cfe3f1;font-size:14px;color:#5b676d">Balance</td><td align="right" style="padding:12px 0 4px;border-top:2px solid #cfe3f1;font-size:16px;font-weight:700;color:#15803d">Fully paid</td></tr>`;
  const pay = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${payRows
    .map(([k, v]) => `<tr><td style="padding:6px 0;font-size:14px;color:#5b676d">${esc(k)}</td><td align="right" style="padding:6px 0;font-size:15px;font-weight:700;color:#10181c">${esc(v)}</td></tr>`)
    .join("")}${balanceRow}</table>`;
  const driver = driverData(b);
  return {
    subject: `Booking confirmed: ${b.ref}`,
    text: `Your booking ${b.ref} is confirmed. ${b.from_city} to ${b.to_city} on ${formatDate(b.travel_date)} at ${to12h(b.travel_time)}. Paid ${formatINR(paid)}, balance ${formatINR(due)}. Your ticket and invoice are attached.`,
    html: layout(
      site,
      "Your booking is confirmed",
      `<p style="margin:0">Hi ${esc(b.traveller_name)}, thank you for booking with ${esc(site.name)}. Your e-ticket and invoice are attached to this email.</p>
${tripBlock(b)}
${driver.length ? driverCard(b) : ""}
${card("Payment", pay, "blue")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;background:#fff8e6;border-radius:10px"><tr><td style="padding:12px 16px;font-size:13px;line-height:20px;color:#6b5314">${due > 0 ? `The balance can be paid online until ${esc(describeMinutes(rules.balanceCutoffHours * 60))} before departure, or to the driver at the end of the trip. ` : ""}Free cancellation until ${esc(describeMinutes(rules.freeCancelMinutes))} before departure.</td></tr></table>`,
      { badge: { text: "Confirmed", color: "#15803d", bg: "#dcfce7" }, preheader: `${b.from_city} to ${b.to_city} on ${formatDate(b.travel_date)} at ${to12h(b.travel_time)}` },
    ),
  };
}

export function cancellationEmail(site: SiteData, rules: BookingSettings, b: BookingRow, refund: number) {
  void rules;
  const refundLine =
    refund > 0
      ? `Refund of ${formatINR(refund)} initiated to your original payment method. It arrives in 5-7 working days.`
      : `No refund applies to this cancellation (it was too close to departure for a refund).`;
  return {
    subject: `Booking cancelled: ${b.ref}`,
    text: `Your booking ${b.ref} has been cancelled. ${refundLine}`,
    html: layout(
      site,
      "Your booking is cancelled",
      `<p style="margin:0">Hi ${esc(b.traveller_name)}, your booking has been cancelled.</p>
${tripBlock(b)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;background:${refund > 0 ? "#ecfdf5" : "#fff8e6"};border-radius:10px"><tr><td style="padding:12px 16px;font-size:14px;line-height:21px;color:${refund > 0 ? "#065f46" : "#6b5314"}">${esc(refundLine)}</td></tr></table>`,
      { badge: { text: "Cancelled", color: "#b91c1c", bg: "#fee2e2" }, preheader: `Booking ${b.ref} has been cancelled` },
    ),
  };
}
