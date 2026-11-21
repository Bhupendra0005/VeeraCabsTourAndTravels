import type { Field } from "@/lib/cms/types";

/** Look and wording of the PDF invoice and e-ticket. Edited by the owner in Admin > Invoice & ticket. */

export const DOCUMENT_LAYOUT_KEY = "document_layout";

export type DocumentLayout = {
  look: {
    theme: string;
    customColor: string;
    logoImage: string;
    showVehiclePhoto: boolean;
    showContact: boolean;
    showGstin: boolean;
  };
  invoice: {
    title: string;
    subtitle: string;
    showStatus: boolean;
    showPayments: boolean;
    terms: string;
  };
  ticket: {
    title: string;
    subtitle: string;
    showNotes: boolean;
    notes: string[];
  };
  footer: {
    thanks: string;
    showSupport: boolean;
    supportLabel: string;
    note: string;
  };
};

export const DEFAULT_DOCUMENT_LAYOUT: DocumentLayout = {
  look: {
    theme: "blue",
    customColor: "#1473e0",
    logoImage: "",
    showVehiclePhoto: true,
    showContact: true,
    showGstin: true,
  },
  invoice: {
    title: "TAX INVOICE",
    subtitle: "Invoice for your travel booking",
    showStatus: true,
    showPayments: true,
    terms: "",
  },
  ticket: {
    title: "E-TICKET",
    subtitle: "Your travel booking is confirmed",
    showNotes: true,
    notes: [
      "Free cancellation until {freeCancel} before departure.",
      "After that a 100% penalty applies and no refund is given.",
      "Pay the balance online until {balanceCutoff} before departure, or to the driver at trip end.",
      "Keep this ticket and a valid photo ID with you. Driver details are shared before pickup.",
    ],
  },
  footer: {
    thanks: "Thank you for choosing",
    showSupport: true,
    supportLabel: "Support 24x7:",
    note: "This is a computer-generated document and does not need a signature.",
  },
};

export const THEME_OPTIONS = [
  { value: "blue", label: "Veera blue (default)", hex: "#1473e0" },
  { value: "green", label: "Emerald green", hex: "#12945a" },
  { value: "teal", label: "Teal", hex: "#0e8f9a" },
  { value: "orange", label: "Sunset orange", hex: "#e8660c" },
  { value: "purple", label: "Royal purple", hex: "#7242d6" },
  { value: "red", label: "Crimson red", hex: "#d12f3a" },
  { value: "slate", label: "Slate grey", hex: "#3f566e" },
  { value: "custom", label: "Custom colour", hex: "" },
] as const;

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const DOCUMENT_LAYOUT_FIELDS: Field[] = [
  {
    type: "group",
    key: "look",
    label: "Look & branding",
    hint: "Colours and logo used on both the invoice and the ticket.",
    fields: [
      {
        type: "select",
        key: "theme",
        label: "Colour theme",
        options: THEME_OPTIONS.map(({ value, label }) => ({ value, label })),
      },
      {
        type: "text",
        key: "customColor",
        label: "Custom colour",
        max: 7,
        placeholder: "#1473e0",
        hint: "Used when the theme is Custom colour. Format #RRGGBB.",
      },
      {
        type: "image",
        key: "logoImage",
        label: "Logo (optional)",
        hint: "Leave empty to use the built-in logo. A PNG with a transparent background looks best.",
      },
      { type: "toggle", key: "showVehiclePhoto", label: "Show the booked vehicle's photo on the e-ticket" },
      { type: "toggle", key: "showContact", label: "Show address, phone and email in the header" },
      { type: "toggle", key: "showGstin", label: "Print the GSTIN under the logo", hint: "Set the GSTIN under Website > Contact & business." },
    ],
  },
  {
    type: "group",
    key: "invoice",
    label: "Invoice",
    fields: [
      { type: "text", key: "title", label: "Title", max: 24, placeholder: "TAX INVOICE" },
      { type: "text", key: "subtitle", label: "Sub-title", max: 60 },
      { type: "toggle", key: "showStatus", label: "Show the Paid / Unpaid badge" },
      { type: "toggle", key: "showPayments", label: "List the payments received" },
      {
        type: "textarea",
        key: "terms",
        label: "Terms or bank details (printed at the bottom)",
        max: 500,
        rows: 4,
        hint: "Optional. For example payment terms, bank account for transfers or a GST note. Keep it short: about 2 lines fit when payments are listed, more if you hide the payments list.",
      },
    ],
  },
  {
    type: "group",
    key: "ticket",
    label: "E-ticket",
    fields: [
      { type: "text", key: "title", label: "Title", max: 24, placeholder: "E-TICKET" },
      { type: "text", key: "subtitle", label: "Sub-title (confirmed bookings)", max: 60 },
      { type: "toggle", key: "showNotes", label: 'Show the "Good to know" box' },
      {
        type: "strings",
        key: "notes",
        label: "Good to know: points",
        max: 150,
        maxItems: 4,
        multiline: true,
        hint: "Up to 4 short points. Use {freeCancel} and {balanceCutoff} to insert the times from Booking settings.",
      },
    ],
  },
  {
    type: "group",
    key: "footer",
    label: "Footer",
    fields: [
      { type: "text", key: "thanks", label: "Thank-you line", max: 40, hint: "Your business name is added on the next line." },
      { type: "toggle", key: "showSupport", label: "Show the support phone numbers" },
      { type: "text", key: "supportLabel", label: "Support label", max: 30 },
      { type: "text", key: "note", label: "Small print", max: 120 },
    ],
  },
];

/* --------------------------------- colours -------------------------------- */

/** The accent colour (#RRGGBB) for a layout, or null for the built-in blue. */
export function accentHex(layout: DocumentLayout): string | null {
  const { theme, customColor } = layout.look;
  if (theme === "blue") return null;
  if (theme === "custom") return HEX_COLOR.test(customColor) ? customColor : null;
  return THEME_OPTIONS.find((option) => option.value === theme)?.hex || null;
}

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    const x = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)];
}

/** Every shade the documents use, derived from one accent colour. */
export type Palette = Record<
  | "page"
  | "tint"
  | "tintStrong"
  | "cardBorder"
  | "blueBg"
  | "blue"
  | "blueMid"
  | "blueDeep"
  | "navy"
  | "wave1"
  | "wave2"
  | "footTop"
  | "footAccent"
  | "footBottom"
  | "footBar"
  | "routeA"
  | "routeB"
  | "routeText",
  Rgb
>;

export function paletteFrom(hex: string): Palette {
  const [h, sRaw, lRaw] = rgbToHsl(hexToRgb(hex));
  const s = Math.min(0.85, Math.max(0.35, sRaw));
  // keep the accent itself readable on white: not too light, not too dark
  const base = hslToRgb(h, s, Math.min(0.5, Math.max(0.34, lRaw)));
  const shade = (l: number, sat = s) => hslToRgb(h, Math.min(1, sat), l);
  return {
    page: shade(0.975, s * 0.7),
    tint: shade(0.955, s * 0.8),
    tintStrong: shade(0.915, s * 0.85),
    cardBorder: shade(0.885, s * 0.75),
    blueBg: shade(0.92, s * 0.85),
    blue: base,
    blueMid: shade(0.31),
    blueDeep: shade(0.2),
    navy: shade(0.16),
    wave1: shade(0.91, s * 0.8),
    wave2: shade(0.955, s * 0.75),
    footTop: shade(0.33),
    footAccent: shade(0.66),
    footBottom: shade(0.18),
    footBar: shade(0.14),
    routeA: shade(0.38),
    routeB: shade(0.22),
    routeText: shade(0.88, s * 0.9),
  };
}
