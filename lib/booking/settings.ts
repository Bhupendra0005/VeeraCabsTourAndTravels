import type { Field } from "@/lib/cms/types";

/** Business rules for online booking. Edited by the owner in Admin > Booking settings. */
export type BookingSettings = {
  onlineBookingEnabled: boolean;
  maintenanceMessage: string;
  gstPercent: number;
  partPayPercent: number;
  insuranceEnabled: boolean;
  insuranceRupees: number;
  freeCancelMinutes: number;
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
  freeCancelMinutes: 60,
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
  { type: "toggle", key: "insuranceEnabled", label: "Offer optional trip protection" },
  { type: "number", key: "insuranceRupees", label: "Trip protection price (₹)", min: 0, max: 5000, step: 1 },
  {
    type: "number",
    key: "freeCancelMinutes",
    label: "Free cancellation until (minutes before pickup)",
    min: 0,
    max: 10080,
    step: 5,
    hint: "60 means customers can cancel for a full refund until 1 hour before pickup.",
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
