import type { BookingTripType } from "@/lib/booking/config";

/** Whether a charge is already in the fare, paid on top as per the receipt, or not mentioned (""). */
export type ChargeTerm = "included" | "extra" | "";

export type ChargeTerms = { toll: ChargeTerm; tax: ChargeTerm; parking: ChargeTerm };

/**
 * What the fare covers, as printed on the invoice (the same rules as the Inclusions / Exclusions on the review page):
 * one-way = toll and State Tax included, parking extra; round trip = toll, State Tax and parking all extra.
 * Airport and local trips say nothing about these charges, so the invoice shows no line for them.
 */
export function chargeTerms(tripType: BookingTripType): ChargeTerms | null {
  if (tripType === "one_way") return { toll: "included", tax: "included", parking: "extra" };
  if (tripType === "round_trip") return { toll: "extra", tax: "extra", parking: "extra" };
  return null;
}

const WORD = { included: "Included", extra: "Extra" } as const;

/**
 * One line for the invoice: the right-hand label ("As per receipt" when anything is paid on top) and the detail under the
 * title. Null when none of the three charges is mentioned.
 */
export function chargeLine(terms: ChargeTerms): { label: string; detail: string } | null {
  const parts = ([["Toll", terms.toll], ["Tax", terms.tax], ["Parking", terms.parking]] as const).filter(([, term]) => term !== "");
  if (parts.length === 0) return null;
  return {
    label: parts.some(([, term]) => term === "extra") ? "As per receipt" : "Included",
    detail: parts.map(([name, term]) => `${name}: ${WORD[term as "included" | "extra"]}`).join("  |  "),
  };
}
