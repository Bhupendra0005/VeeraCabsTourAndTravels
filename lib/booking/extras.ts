import type { Addon, Coupon } from "@/lib/booking/config";
import type { Field } from "@/lib/cms/types";

/** Offers and wording around a booking. Edited by the owner in Admin > Website content > Booking offers. */
export type Inclusion = { title: string; text: string; active: boolean };

export type BookingExtras = {
  /** Charge in rupees for each extra stop on an outstation trip. */
  stopCharge: number;
  /** Flat fee in rupees added to every booking and shown under Taxes & Fees. 0 = no fee. */
  serviceFee: number;
  serviceFeeLabel: string;
  coupons: Coupon[];
  addons: Addon[];
  inclusions: Inclusion[];
};

export const BOOKING_EXTRAS_KEY = "booking_extras";

/** Sample content: the owner must confirm every line (prices, coupons, what the fare includes). */
export const DEFAULT_BOOKING_EXTRAS: BookingExtras = {
  stopCharge: 300,
  serviceFee: 0,
  serviceFeeLabel: "Service Fee",
  coupons: [
    {
      code: "WELCOME10",
      description: "Get 10% off (up to ₹300) on your first cab booking",
      kind: "percent",
      value: 10,
      maxDiscount: 300,
      minFare: 1500,
      active: true,
      firstBookingOnly: true,
    },
    {
      code: "SAVE200",
      description: "Get ₹200 off on outstation bookings above ₹4,000",
      kind: "flat",
      value: 200,
      maxDiscount: 0,
      minFare: 4000,
      active: true,
    },
  ],
  addons: [
    {
      label: "Roof Carrier",
      description: "Add Roof Carrier to fit 4 more bags",
      rupees: 150,
      active: true,
      highlight: true,
    },
    {
      label: "Driver's Language",
      description: "Choose your preferred language for a smoother ride. Most likely the assigned driver speaks the local language if not selected",
      rupees: 100,
      active: true,
      highlight: false,
    },
  ],
  inclusions: [
    { title: "Toll, tax and other charges", text: "Toll, State Tax and Parking charges are included", active: true },
    { title: "Driver allowance", text: "Driver food and accommodation (stay) charges are included", active: true },
    { title: "Fuel charges included", text: "Fuel cost for your trip is included in the fare", active: true },
  ],
};

export const BOOKING_EXTRAS_FIELDS: Field[] = [
  {
    type: "number",
    key: "serviceFee",
    label: "Service fee per booking (₹)",
    min: 0,
    max: 5000,
    step: 1,
    hint: "Shown as a separate line under Taxes & Fees. Set 0 for no fee.",
  },
  { type: "text", key: "serviceFeeLabel", label: "Service fee name", max: 30 },
  {
    type: "number",
    key: "stopCharge",
    label: "Charge for each extra stop (₹)",
    min: 0,
    max: 10000,
    step: 1,
    hint: "Customers can add up to 3 stops on an outstation trip. Set 0 to make stops free.",
  },
  {
    type: "list",
    key: "coupons",
    label: "Coupons",
    itemTitle: "code",
    itemSubtitle: "description",
    maxItems: 20,
    addLabel: "Add coupon",
    fields: [
      { type: "text", key: "code", label: "Coupon code", required: true, max: 20, placeholder: "WELCOME10", hint: "Capital letters and numbers, no spaces." },
      { type: "text", key: "description", label: "Offer text shown to customers", required: true, max: 120 },
      {
        type: "select",
        key: "kind",
        label: "Discount type",
        options: [
          { value: "percent", label: "Percent of the fare" },
          { value: "flat", label: "Flat rupees off" },
        ],
      },
      { type: "number", key: "value", label: "Discount (% or ₹, as chosen above)", min: 1, max: 100000, step: 1, defaultValue: 10 },
      { type: "number", key: "maxDiscount", label: "Maximum discount in ₹ (percent coupons, 0 = no limit)", min: 0, max: 100000, step: 1, defaultValue: 0 },
      { type: "number", key: "minFare", label: "Minimum fare in ₹ for the coupon (0 = none)", min: 0, max: 1000000, step: 1, defaultValue: 0 },
      { type: "toggle", key: "firstBookingOnly", label: "Only for a customer's first booking", defaultValue: false, hint: "A customer who already has a confirmed, completed or pending booking cannot use it." },
      { type: "number", key: "maxUsesPerCustomer", label: "Times one customer can use it (0 = no limit)", min: 0, max: 1000, step: 1, defaultValue: 0 },
      { type: "number", key: "maxUsesTotal", label: "Total times it can be used by everyone (0 = no limit)", min: 0, max: 100000, step: 1, defaultValue: 0, hint: "Cancelled bookings do not count." },
      { type: "toggle", key: "active", label: "Coupon is active", defaultValue: true },
    ],
  },
  {
    type: "list",
    key: "addons",
    label: "Special requests (paid extras)",
    itemTitle: "label",
    itemSubtitle: "description",
    maxItems: 10,
    addLabel: "Add special request",
    fields: [
      { type: "text", key: "label", label: "Name", required: true, max: 40, placeholder: "Roof Carrier" },
      { type: "text", key: "description", label: "Short description", max: 160 },
      { type: "number", key: "rupees", label: "Price (₹)", min: 0, max: 100000, step: 1, defaultValue: 100 },
      { type: "toggle", key: "active", label: "Offer this request", defaultValue: true },
      { type: "toggle", key: "highlight", label: "Show as a hint under cab cards", hint: "The first highlighted request appears as a one-line offer under each cab.", defaultValue: false },
    ],
  },
  {
    type: "list",
    key: "inclusions",
    label: "What the fare includes",
    itemTitle: "title",
    itemSubtitle: "text",
    maxItems: 10,
    addLabel: "Add inclusion",
    fields: [
      { type: "text", key: "title", label: "Title", required: true, max: 60 },
      { type: "text", key: "text", label: "Details", max: 160 },
      { type: "toggle", key: "active", label: "Show this line", defaultValue: true },
    ],
  },
];
