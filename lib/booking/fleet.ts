/** "Dzire, Etios" -> "Dzire, Etios or similar"; no models -> just the vehicle name. */
export function cabHeading(title: string, models: string): { name: string; similar: boolean } {
  const m = models.trim();
  return m ? { name: m, similar: true } : { name: title, similar: false };
}
