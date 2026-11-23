import type { Field } from "@/lib/cms/types";

/**
 * Wording and switches of the online booking pages. Edited by the owner in
 * Admin > Online booking > Booking page, so nothing here needs a developer.
 */
export type BookingPageDoc = {
  /** Banner under the site header on the booking page (text, three highlights and the picture). */
  subtitle: string;
  showHeroBanner: boolean;
  /** Keep the banner above the cab list after a search too (otherwise a compact search bar is shown). */
  heroOnResults: boolean;
  /** Your own banner picture (empty = the built-in one). */
  heroImage: string;
  heroPoints: { label: string }[];
  titleLead: string;
  titleEmphasis: string;
  description: string;
  /** Outstation fares worked out from the road distance between the two places the customer types (needs a Google Maps key on the server). */
  distancePricing: boolean;
  /** Search tabs. Outstation One-Way and Round-Trip are always on. */
  enableAirport: boolean;
  enableHourly: boolean;
  /** "+ Add Stops" on outstation trips, and how many stops a customer may add. */
  enableStops: boolean;
  maxStops: number;
  /** Ratings on cab cards, the reviews card and the "Rate your trip" form. */
  enableReviews: boolean;
  /** The optional "Add GST details" box on the review page. */
  enableGstDetails: boolean;
  /** One-Way tab: an optional Return date that turns the search into a round trip (like MakeMyTrip). */
  oneWayReturn: boolean;
  returnHint: string;
  /** Show the separate Outstation Round-Trip tab. */
  showRoundTripTab: boolean;
  /** Ask "Travellers & Bags" on the Airport / Hourly tabs (MakeMyTrip does not). */
  airportAskTravellers: boolean;
  hourlyAskTravellers: boolean;
  /** Filters and sorting on the cab list. */
  showTypeFilter: boolean;
  showModelFilter: boolean;
  showFuelFilter: boolean;
  showSort: boolean;
  /** Coupon & Offers card on the review page. */
  showCoupons: boolean;
  /** Address suggestions while typing (free OpenStreetMap lookup; Google Places when NEXT_PUBLIC_GOOGLE_MAPS_KEY is set). */
  addressSuggestions: boolean;
  trustPoints: { label: string; text?: string }[];
  /** "Best Value" ribbon on the cheapest cab of a search. */
  showBestValue: boolean;
  reviewTags: string[];
};

export const BOOKING_PAGE_KEY = "booking_page";

export const DEFAULT_BOOKING_PAGE: BookingPageDoc = {
  titleLead: "Book Your Ride",
  titleEmphasis: "Online",
  subtitle: "Quick, easy and secure cab booking for your travel needs.",
  showHeroBanner: true,
  heroOnResults: false,
  heroImage: "",
  heroPoints: [{ label: "Instant Booking" }, { label: "Safe & Reliable" }, { label: "Transparent Pricing" }],
  description: "Pick your route and date, choose a vehicle and pay securely. Your ticket and invoice arrive by email.",
  distancePricing: true,
  enableAirport: true,
  enableHourly: true,
  enableStops: true,
  maxStops: 3,
  enableReviews: true,
  enableGstDetails: true,
  oneWayReturn: false, // One-Way tab has no Return date; round trips use their own tab
  returnHint: "Add return date",
  showRoundTripTab: true,
  airportAskTravellers: false,
  hourlyAskTravellers: false,
  showTypeFilter: true,
  showModelFilter: true,
  showFuelFilter: true,
  showSort: true,
  showCoupons: true,
  addressSuggestions: true,
  showBestValue: true,
  trustPoints: [
    { label: "Trusted Drivers", text: "Verified & Experienced" },
    { label: "Clean Cabs", text: "Hygienic & Well-Maintained" },
    { label: "On-Time Pickup", text: "Reliable & Punctual" },
  ],
  reviewTags: ["Good Navigation Skills", "Safe Driving", "Clean Interiors", "Polite Behaviour", "Well Dressed", "On-Time Pickup"],
};

/**
 * The order here is the order on screen. Admin > Online booking shows these in three tabs
 * (Banner & wording, Search & trip options, Cab list & reviews), grouped in pages.ts.
 */
export const BOOKING_PAGE_FIELDS: Field[] = [
  /* Banner & wording */
  { type: "text", key: "titleLead", label: "Banner heading (first part)", required: true, max: 60 },
  { type: "text", key: "titleEmphasis", label: "Banner heading (highlighted part)", max: 60, hint: "Shown in the bright accent colour, for example \"Online\"." },
  { type: "text", key: "subtitle", label: "Banner sub-heading", max: 120 },
  { type: "toggle", key: "showHeroBanner", label: "Show the banner with the picture", hint: "Off = just the search box under the header." },
  { type: "toggle", key: "heroOnResults", label: "Keep the banner above the cab list after a search" },
  { type: "image", key: "heroImage", label: "Banner picture (optional)", aspect: "3:1", hint: "Wide picture, about 2000 x 650. Leave empty to use the built-in one." },
  {
    type: "list",
    key: "heroPoints",
    label: "Highlights under the banner heading (up to 4)",
    itemTitle: "label",
    maxItems: 4,
    addLabel: "Add highlight",
    fields: [{ type: "text", key: "label", label: "Text", required: true, max: 30 }],
  },
  { type: "textarea", key: "description", label: "Text shown before the first search", max: 240, rows: 2 },

  /* Search & trip options */
  { type: "toggle", key: "distancePricing", label: "Outstation fares by distance", hint: "On: the customer types any pickup and drop place, the road distance is worked out and the fare is distance x the vehicle's rate per km (set in Vehicles). Off, or no routing key on the server: only the routes you priced in Routes & fares are offered." },
  { type: "toggle", key: "enableAirport", label: "Show the Airport Transfers tab", hint: "It only appears when you have added airport fares." },
  { type: "toggle", key: "enableHourly", label: "Show the Hourly Rentals tab", hint: "It only appears when you have added hourly packages." },
  { type: "toggle", key: "showRoundTripTab", label: "Show the separate Outstation Round-Trip tab" },
  { type: "toggle", key: "oneWayReturn", label: "One-Way tab: optional Return date", hint: "Adding a return date turns the search into a round trip, exactly like MakeMyTrip." },
  { type: "toggle", key: "airportAskTravellers", label: "Airport tab: ask Travellers & Bags", hint: "Off = like MakeMyTrip. Turn on if you want to hide cabs that cannot seat the group." },
  { type: "toggle", key: "hourlyAskTravellers", label: "Hourly tab: ask Travellers & Bags" },
  { type: "toggle", key: "enableStops", label: "Allow extra stops on outstation trips" },
  { type: "toggle", key: "addressSuggestions", label: "Suggest addresses while typing", hint: "Free by default (OpenStreetMap data). Your airports are always suggested first." },
  { type: "text", key: "returnHint", label: "Text shown in the empty Return date box", max: 60 },
  { type: "number", key: "maxStops", label: "Most stops a customer can add", min: 1, max: 6, step: 1 },

  /* Cab list & reviews */
  { type: "toggle", key: "showTypeFilter", label: "Cab list: Cab Type filter" },
  { type: "toggle", key: "showModelFilter", label: "Cab list: Cab Model filter" },
  { type: "toggle", key: "showFuelFilter", label: "Cab list: Fuel Type filter" },
  { type: "toggle", key: "showSort", label: "Cab list: Sort by" },
  { type: "toggle", key: "showBestValue", label: "Cab list: \"Best Value\" ribbon on the cheapest cab" },
  { type: "toggle", key: "showCoupons", label: "Review page: Coupon & Offers" },
  { type: "toggle", key: "enableReviews", label: "Customer reviews and ratings", hint: "Turn off to hide ratings on cab cards and stop asking customers to review." },
  { type: "toggle", key: "enableGstDetails", label: "Let customers add GST details for the invoice" },
  {
    type: "list",
    key: "trustPoints",
    label: "Highlights above the cab list",
    itemTitle: "label",
    itemSubtitle: "text",
    maxItems: 4,
    addLabel: "Add point",
    fields: [
      { type: "text", key: "label", label: "Heading", required: true, max: 30 },
      { type: "text", key: "text", label: "Small text under it", max: 50 },
    ],
  },
  { type: "strings", key: "reviewTags", label: "Quick tags customers can tick in a review", max: 30, maxItems: 10 },
];
