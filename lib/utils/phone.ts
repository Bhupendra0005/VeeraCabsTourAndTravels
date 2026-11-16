/**
 * Cleans a mobile number as someone types or pastes it: digits only, a +91 / 91 / 0 prefix dropped, at most 10 digits.
 * ("+91 98765 43210" and "98765 43210" both become "9876543210".)
 */
export function cleanMobile(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length > 10 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}
