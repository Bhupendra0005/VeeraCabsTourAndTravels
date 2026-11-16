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
};

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
