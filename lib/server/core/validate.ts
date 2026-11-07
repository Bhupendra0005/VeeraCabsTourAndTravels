import "server-only";
import { HttpError } from "@/lib/server/core/http";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/;

export function str(body: Record<string, unknown>, key: string, min: number, max: number): string {
  const v = body[key];
  if (typeof v !== "string") throw new HttpError(400, `Invalid ${key}.`);
  const t = v.trim().replace(/[\u0000-\u001f]/g, " ");
  if (t.length < min || t.length > max) throw new HttpError(400, `Invalid ${key}.`);
  return t;
}

export function optStr(body: Record<string, unknown>, key: string, max: number): string {
  const v = body[key];
  if (v === undefined || v === null || v === "") return "";
  return str(body, key, 0, max);
}

export function uuid(value: unknown, label = "id"): string {
  if (typeof value !== "string" || !UUID.test(value)) throw new HttpError(400, `Invalid ${label}.`);
  return value.toLowerCase();
}

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

export function email(value: unknown): string {
  if (typeof value !== "string") throw new HttpError(400, "Enter a valid email address.");
  const v = value.trim().toLowerCase();
  if (v.length > 254 || !EMAIL.test(v)) throw new HttpError(400, "Enter a valid email address.");
  return v;
}

export function phone(value: unknown): string {
  let digits = typeof value === "string" ? value.replace(/\D/g, "") : "";
  if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2);
  if (!/^[6-9]\d{9}$/.test(digits)) throw new HttpError(400, "Enter a valid 10-digit mobile number.");
  return digits;
}

export function isoDate(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new HttpError(400, `Invalid ${label}.`);
  }
  return value;
}

export function hhmm(value: unknown): string {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new HttpError(400, "Invalid pickup time.");
  }
  return value;
}

/** Only same-site relative paths, so a `next` parameter cannot become an open redirect. */
export function safeNextPath(value: unknown, fallback = "/bookings"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) {
    return fallback;
  }
  return value;
}
