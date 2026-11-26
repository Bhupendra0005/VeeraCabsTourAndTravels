/** "Dzire, Etios" -> "Dzire, Etios or similar"; no models -> just the vehicle name. */
export function cabHeading(title: string, models: string): { name: string; similar: boolean } {
  const m = models.trim();
  return m ? { name: m, similar: true } : { name: title, similar: false };
}

/** The owner's "% off" on a vehicle: the usual fare (whole rupees) and the amount saved, in paise. Null when there is no offer. */
export type ListOffer = { percent: number; was: number; saved: number };

export function listOffer(fare: number, discountPercent: number | undefined): ListOffer | null {
  const percent = Math.max(0, Math.min(70, Math.round(discountPercent ?? 0)));
  if (percent === 0 || fare <= 0) return null;
  const was = Math.round(fare / (1 - percent / 100) / 100) * 100;
  return was > fare ? { percent, was, saved: was - fare } : null;
}
