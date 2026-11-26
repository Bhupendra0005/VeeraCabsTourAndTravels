import { describeMinutes } from "@/lib/booking/config";
import { hasRefundSteps, refundBands, refundSentence } from "@/lib/booking/refund";
import type { BookingSettings } from "@/lib/booking/settings";
import type { SiteData } from "@/lib/site";

export type LegalSection = { title: string; body: string[] };

/**
 * DRAFT wording that mirrors how the booking system actually behaves. Have the client (and a
 * lawyer) review it before launch. The numbers come from lib/booking-config.ts so the policy
 * and the code cannot drift apart.
 */
export function cancellationSections(s: BookingSettings, site: SiteData): LegalSection[] {
  const free = describeMinutes(s.freeCancelMinutes);
  const stepped = hasRefundSteps(s.freeCancelMinutes, s.refundSlabs);
  return [
  {
    title: stepped ? "Refunds and penalty" : "Penalty",
    body: stepped
      ? [
          "How much you get back depends on how long before pickup you cancel, counted from the pickup time on your ticket:",
          ...refundBands(s.freeCancelMinutes, s.refundSlabs).map((band) => `${band.text}: ${band.percent === 0 ? "no refund (100% penalty)" : `${band.percent}% of the amount you paid is refunded`}.`),
          "Refunds go back to your original payment method and usually reach you in 5 to 7 working days, depending on your bank. The part that is not refunded is kept as the cancellation charge.",
        ]
      : [
          `For cancellation, no penalty up to ${free} before departure, and a 100% penalty beyond that.`,
          "If you cancel in time, the full amount you paid is refunded to your original payment method. Refunds usually reach you in 5 to 7 working days, depending on your bank.",
          `If you cancel less than ${free} before departure, no refund is given.`,
        ],
  },
  {
    title: "How to cancel",
    body: [
      "Log in, open My Bookings, choose the booking and press Cancel booking. You can also call us on " +
        `${site.primaryPhone.display} or ${site.secondaryPhone.display}.`,
      "A cancellation cannot be made after the trip has started.",
    ],
  },
  {
    title: "Cancellation by us",
    body: [
      "If we are unable to provide the vehicle you booked, we will offer an alternative or refund everything you have paid.",
      "We are not responsible for delay or cancellation caused by natural calamity, strike, road blockage, heavy traffic or other events beyond our control.",
    ],
  },
  ];
}

export function termsSections(s: BookingSettings): LegalSection[] {
  const free = describeMinutes(s.freeCancelMinutes);
  return [
  {
    title: "1. Bookings",
    body: [
      "A booking is confirmed only after the online payment is received and you get a booking ID. The ticket and invoice are emailed to you and can be downloaded from My Bookings.",
      "You must give correct traveller details. We may refuse or cancel a booking made with false information.",
    ],
  },
  {
    title: "2. Fares and payment",
    body: [
      `Fares are fixed per route and vehicle and are shown before you pay. GST at ${s.gstPercent}% is added and shown separately.`,
      `You can reserve by paying ${s.partPayPercent}% of the total (part pay) or the full amount. The balance can be paid online until ${describeMinutes(s.balanceCutoffHours * 60)} before departure, or to the driver at the end of the trip.`,
      "Payments are processed by Razorpay. We do not store your card or UPI details.",
    ],
  },
  {
    title: "3. Cancellation and refunds",
    body: [
      hasRefundSteps(s.freeCancelMinutes, s.refundSlabs)
        ? `${refundSentence(s.freeCancelMinutes, s.refundSlabs)} See the Cancellation Policy for details.`
        : `Free cancellation applies until ${free} before departure. After that a 100% penalty applies. See the Cancellation Policy for details.`,
    ],
  },
  {
    title: "4. Pickup, waiting and the trip",
    body: [
      "Please be ready at your pickup point at the booked time. Extra waiting time, detours or changes to the route may be charged extra and will be told to you before they are added.",
      "The fare covers the vehicle and driver for the booked route. Anything paid separately will be listed in your booking confirmation.",
      "Smoking, alcohol, illegal items and carrying more passengers or luggage than the vehicle allows are not permitted.",
    ],
  },
  {
    title: "5. Liability",
    body: [
      "We take reasonable care to provide safe and punctual service. We are not liable for loss or delay caused by events beyond our control, and our liability is limited to the amount you paid for the booking.",
    ],
  },
  {
    title: "6. Privacy",
    body: [
      "We use your name, phone number and email only to provide your booking, send your ticket and invoice, and give support. We do not sell your data. The Privacy Policy page has the full details.",
    ],
  },
  {
    title: "7. Governing law",
    body: ["These terms are governed by the laws of India. Courts at Pune, Maharashtra have jurisdiction."],
  },
  ];
}
