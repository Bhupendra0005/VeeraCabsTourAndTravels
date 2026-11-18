import type { RefundSlab } from "@/lib/booking/config";
import type { Field } from "@/lib/cms/types";

/** Business rules for online booking. Edited by the owner in Admin > Booking settings. */
export type BookingSettings = {
  onlineBookingEnabled: boolean;
  maintenanceMessage: string;
  gstPercent: number;
  partPayPercent: number;
  insuranceEnabled: boolean;
  insuranceRupees: number;
  /** One-way trips also pay for the driver's empty return: this share (%) of the one-way fare is added on top. */
  oneWayReturnPercent: number;
  freeCancelMinutes: number;
  /** Partial refunds after the free window ends, for example 6 hours before pickup: 50%. Empty = no partial refunds. */
  refundSlabs: RefundSlab[];
  minLeadMinutes: number;
  balanceCutoffHours: number;
};

export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  onlineBookingEnabled: true,
  maintenanceMessage: "Online booking is paused for a short while. Please call or WhatsApp us to book.",
  gstPercent: 5,
  partPayPercent: 25,
  insuranceEnabled: true,
  insuranceRupees: 99,
  oneWayReturnPercent: 80,
  freeCancelMinutes: 720, // full refund up to 12 hours before pickup
  refundSlabs: [],
  minLeadMinutes: 120,
  balanceCutoffHours: 48,
};

export const BOOKING_SETTINGS_KEY = "booking_settings";

export const BOOKING_SETTINGS_FIELDS: Field[] = [
  {
    type: "toggle",
    key: "onlineBookingEnabled",
    label: "Accept online bookings",
    hint: "Turn off to pause new online bookings (for example during a holiday). Existing bookings are not affected.",
  },
  { type: "text", key: "maintenanceMessage", label: "Message shown while paused", max: 200 },
  {
    type: "number",
    key: "gstPercent",
    label: "GST on fare (%)",
    min: 0,
    max: 28,
    step: 0.5,
    hint: "Confirm the correct rate with your accountant.",
  },
  {
    type: "number",
    key: "partPayPercent",
    label: "Advance for part payment (%)",
    min: 5,
    max: 100,
    step: 1,
    hint: "Share of the total paid online to reserve the cab.",
  },
  {
    type: "number",
    key: "oneWayReturnPercent",
    label: "One-way return charge (%)",
    min: 0,
    max: 200,
    step: 1,
    hint: "A one-way trip also counts the driver's drive back. This share of the one-way fare is added to it: 80 turns a ₹5,000 fare into ₹9,000. 0 = off.",
  },
  { type: "toggle", key: "insuranceEnabled", label: "Offer optional trip protection" },
  { type: "number", key: "insuranceRupees", label: "Trip protection price (₹)", min: 0, max: 5000, step: 1 },
  {
    type: "number",
    key: "freeCancelMinutes",
    label: "Full refund until (minutes before pickup)",
    min: 0,
    max: 10080,
    step: 5,
    hint: "720 means customers can cancel for a full refund until 12 hours before pickup (60 = 1 hour).",
  },
  {
    type: "list",
    key: "refundSlabs",
    label: "Partial refund steps",
    hint: "After the full-refund time ends, cancelling at least this many hours before pickup still returns this share of what was paid. Below the last step nothing is returned.",
    itemTitle: "hoursBefore",
    maxItems: 6,
    addLabel: "Add a refund step",
    fields: [
      { type: "number", key: "hoursBefore", label: "Cancelled at least this many hours before pickup", min: 0.5, max: 720, step: 0.5, defaultValue: 6 },
      { type: "number", key: "percent", label: "Refund (% of what was paid)", min: 1, max: 99, step: 1, defaultValue: 50 },
    ],
  },
  {
    type: "number",
    key: "minLeadMinutes",
    label: "Earliest bookable pickup (minutes from now)",
    min: 0,
    max: 10080,
    step: 5,
  },
  {
    type: "number",
    key: "balanceCutoffHours",
    label: "Online balance payment closes (hours before pickup)",
    min: 0,
    max: 720,
    step: 1,
  },
];
