/** Shared (client + server) pieces of the customer review feature. */

export type PublicReview = {
  cabRating: number;
  driverRating: number;
  tags: string[];
  comment: string;
  /** First name and last initial, e.g. "Shikha B." */
  reviewer: string;
  vehicle: string;
  /** ISO timestamp. */
  date: string;
  /** Set for a review written on another site (e.g. "Google"); website reviews leave it out. */
  source?: string;
  /** Photo of the reviewer (owner-added reviews only); without one the initials of the name are shown. */
  avatarUrl?: string;
};

/** "Shikha B." -> "SB", "Harsh" -> "H": the letters shown in the round picture when a reviewer has no photo. */
export function initialsOf(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  const first = Array.from(words[0])[0] ?? "";
  const last = words.length > 1 ? (Array.from(words[words.length - 1])[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Where an owner-added review was written. */
export const EXTERNAL_SOURCES = {
  google: "Google",
  justdial: "Justdial",
  facebook: "Facebook",
  whatsapp: "WhatsApp message",
  other: "Other",
} as const;
export type ExternalSource = keyof typeof EXTERNAL_SOURCES;

export type ReviewSummary = {
  count: number;
  /** Average cab rating and average driver rating, one decimal. */
  cab: number;
  driver: number;
  /** Cab and driver averaged together; the number shown on a cab card. */
  overall: number;
  tags: { tag: string; count: number }[];
};

/** "Shikha Bahi" -> "Shikha B."; a single name stays as it is. */
export function shortName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Customer";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

export const oneDecimal = (value: number) => Math.round(value * 10) / 10;

export const RATING_WORDS = ["", "Poor", "Below average", "Good", "Very good", "Excellent"] as const;
