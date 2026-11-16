import { describeMinutes, usableRefundSlabs, type RefundSlab } from "@/lib/booking/config";

/**
 * Plain-words description of the refund steps, shared by the booking page, the policy pages, the cancel dialog and
 * the emails, so every place tells the customer the same thing. Safe to use in the browser.
 */

export type RefundBand = { percent: number; text: string };

/** One band per refund level, from "cancel early" to "cancel late". */
export function refundBands(freeCancelMinutes: number, slabs: RefundSlab[] | undefined): RefundBand[] {
  const steps = usableRefundSlabs(freeCancelMinutes, slabs);
  if (freeCancelMinutes <= 0) return [{ percent: 100, text: "Cancel any time before pickup" }];
  const bands: RefundBand[] = [{ percent: 100, text: `Cancel ${describeMinutes(freeCancelMinutes)} or more before pickup` }];
  let upper = freeCancelMinutes;
  for (const step of steps) {
    bands.push({ percent: step.percent, text: `Cancel ${describeMinutes(step.minutes)} to ${describeMinutes(upper)} before pickup` });
    upper = step.minutes;
  }
  bands.push({ percent: 0, text: `Cancel less than ${describeMinutes(upper)} before pickup` });
  return bands;
}

/** True when the owner has set partial-refund steps (so the simple "free or nothing" wording no longer fits). */
export function hasRefundSteps(freeCancelMinutes: number, slabs: RefundSlab[] | undefined): boolean {
  return usableRefundSlabs(freeCancelMinutes, slabs).length > 0;
}

/** The smallest time before pickup at which any refund is still given (the cut-off after which nothing is returned). */
export function lastRefundMinutes(freeCancelMinutes: number, slabs: RefundSlab[] | undefined): number {
  const steps = usableRefundSlabs(freeCancelMinutes, slabs);
  return steps.length ? steps[steps.length - 1].minutes : freeCancelMinutes;
}

/** "100% refund up to 1 day before departure; 50% refund up to 6 hours before departure; no refund after that." */
export function refundSentence(freeCancelMinutes: number, slabs: RefundSlab[] | undefined): string {
  if (freeCancelMinutes <= 0) return "Full refund any time before departure.";
  const parts = [`100% refund up to ${describeMinutes(freeCancelMinutes)} before departure`];
  for (const step of usableRefundSlabs(freeCancelMinutes, slabs)) parts.push(`${step.percent}% refund up to ${describeMinutes(step.minutes)} before departure`);
  parts.push("no refund after that");
  return `${parts.join("; ")}.`;
}
