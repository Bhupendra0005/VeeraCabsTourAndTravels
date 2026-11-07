import "server-only";
import { TRIP_TYPE_LABEL, describeMinutes, formatDate, formatINR, to12h } from "@/lib/booking/config";
import type { BookingSettings } from "@/lib/booking/settings";
import type { BookingRow } from "@/lib/server/bookings/types";
import { esc } from "@/lib/server/email/brevo";
import type { SiteData } from "@/lib/site";

function layout(site: SiteData, title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f3f6f8;font-family:Arial,Helvetica,sans-serif;color:#10181c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0a0c0c;color:#ffffff;padding:18px 24px;font-size:18px;font-weight:700">${esc(site.name)}</td></tr>
<tr><td style="padding:24px"><h1 style="margin:0 0 12px;font-size:20px">${esc(title)}</h1>${body}</td></tr>
<tr><td style="padding:16px 24px;background:#f3f6f8;font-size:12px;color:#5b676d">
${esc(site.address.full)}<br>${esc(site.primaryPhone.display)} &middot; ${esc(site.email)}</td></tr>
</table></td></tr></table></body></html>`;
}

export function otpEmail(site: SiteData, code: string) {
  return {
    subject: `Your ${site.shortName} login code: ${code}`,
    text: `Your login code is ${code}. It is valid for 10 minutes. If you did not request it, ignore this email.`,
    html: layout(
      site,
      "Your login code",
      `<p style="margin:0 0 16px">Use this code to sign in. It is valid for 10 minutes.</p>
<p style="margin:0 0 16px;font-size:32px;letter-spacing:8px;font-weight:700">${esc(code)}</p>
<p style="margin:0;color:#5b676d;font-size:13px">If you did not request this, you can safely ignore this email. Never share this code with anyone.</p>`,
    ),
  };
}

function tripRows(b: BookingRow): string {
  const rows: [string, string][] = [
    ["Booking ID", b.ref],
    ["Trip", `${b.from_city} to ${b.to_city} (${TRIP_TYPE_LABEL[b.trip_type]})`],
    ["Pickup", b.pickup_address],
    ["Date & time", `${formatDate(b.travel_date)}, ${to12h(b.travel_time)}`],
    ["Vehicle", b.vehicle_type],
    ["Passengers", String(b.passengers)],
    ["Traveller", `${b.traveller_name} (+91 ${b.traveller_phone})`],
    ["Total fare", formatINR(b.total)],
  ];
  if (b.return_date) rows.splice(4, 0, ["Return date", formatDate(b.return_date)]);
  return rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:#5b676d;width:140px;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;font-weight:600">${esc(v)}</td></tr>`,
    )
    .join("");
}

export function confirmationEmail(site: SiteData, rules: BookingSettings, b: BookingRow, paid: number) {
  const due = Math.max(0, b.total - paid);
  return {
    subject: `Booking confirmed: ${b.ref}`,
    text: `Your booking ${b.ref} is confirmed. ${b.from_city} to ${b.to_city} on ${formatDate(b.travel_date)} at ${to12h(b.travel_time)}. Paid ${formatINR(paid)}, balance ${formatINR(due)}. Your ticket and invoice are attached.`,
    html: layout(
      site,
      "Your booking is confirmed",
      `<p style="margin:0 0 12px">Hi ${esc(b.traveller_name)}, thank you for booking with ${esc(site.name)}. Your ticket and invoice are attached.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${tripRows(b)}
<tr><td style="padding:6px 0;color:#5b676d">Paid</td><td style="padding:6px 0;font-weight:600">${esc(formatINR(paid))}</td></tr>
<tr><td style="padding:6px 0;color:#5b676d">Balance</td><td style="padding:6px 0;font-weight:600">${esc(formatINR(due))}</td></tr></table>
<p style="margin:16px 0 0;font-size:13px;color:#5b676d">The balance can be paid online until ${esc(describeMinutes(rules.balanceCutoffHours * 60))} before departure, or to the driver at the end of the trip. Free cancellation until ${esc(describeMinutes(rules.freeCancelMinutes))} before departure.</p>`,
    ),
  };
}

export function cancellationEmail(site: SiteData, rules: BookingSettings, b: BookingRow, refund: number) {
  const refundLine =
    refund > 0
      ? `A refund of ${formatINR(refund)} has been initiated to your original payment method. It usually reaches you in 5 to 7 working days.`
      : `No refund applies to this cancellation (free cancellation ends ${describeMinutes(rules.freeCancelMinutes)} before departure).`;
  return {
    subject: `Booking cancelled: ${b.ref}`,
    text: `Your booking ${b.ref} has been cancelled. ${refundLine}`,
    html: layout(
      site,
      "Your booking is cancelled",
      `<p style="margin:0 0 12px">Hi ${esc(b.traveller_name)}, your booking has been cancelled.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${tripRows(b)}</table>
<p style="margin:16px 0 0">${esc(refundLine)}</p>`,
    ),
  };
}
