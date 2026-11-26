import type { Field } from "@/lib/cms/types";

/**
 * Validates and cleans a document against its schema. Unknown keys are dropped, text is trimmed and
 * length-limited, numbers are range-checked, links and images must be safe. Pure and shared, but only
 * the server's result is trusted.
 */

export class DocError extends Error {}

const IMAGE_HOSTS = (): string[] => {
  const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
  try {
    return endpoint ? [new URL(endpoint).host] : [];
  } catch {
    return [];
  }
};

function clean(value: unknown, max: number, multiline = false): string {
  if (typeof value !== "string") return "";
  const text = multiline ? value.replace(/\r\n/g, "\n") : value.replace(/[\r\n]+/g, " ");
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);
}

function safeLink(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return true;
  if (/^(tel:\+?[\d\s-]{5,20}|mailto:[^\s<>"]+@[^\s<>"]+)$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function safeImage(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !value.includes("..")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && IMAGE_HOSTS().includes(url.host);
  } catch {
    return false;
  }
}

function fail(path: string, message: string): never {
  throw new DocError(`${path}: ${message}`);
}

export function validateFields(fields: Field[], input: unknown, path = ""): Record<string, unknown> {
  const source = input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};

  for (const field of fields) {
    const where = path ? `${path} > ${field.label}` : field.label;
    const raw = source[field.key];

    switch (field.type) {
      case "text":
      case "textarea": {
        const value = clean(raw, field.max ?? (field.type === "text" ? 200 : 4000), field.type === "textarea");
        if (field.required && !value) fail(where, "is required");
        if (field.type === "text" && field.format && value && !(field.format === "date" ? /^\d{4}-\d{2}-\d{2}$/ : /^([01]\d|2[0-3]):[0-5]\d$/).test(value)) {
          fail(where, field.format === "date" ? "must be a date" : "must be a time");
        }
        out[field.key] = value;
        break;
      }
      case "link": {
        const value = clean(raw, field.max ?? 500);
        if (field.required && !value) fail(where, "is required");
        if (value && !safeLink(value)) fail(where, "must be a web link (https://...), tel:, mailto: or a path starting with /");
        out[field.key] = value;
        break;
      }
      case "image": {
        const value = clean(raw, 800);
        if (field.required && !value) fail(where, "is required");
        if (value && !safeImage(value)) fail(where, "must be an image from your media library");
        out[field.key] = value;
        break;
      }
      case "number": {
        // a field added after the document was first saved has no value yet: use its default
        const given = raw === undefined || raw === null || raw === "" ? field.defaultValue : raw;
        const value = typeof given === "number" ? given : Number(given);
        if (!Number.isFinite(value)) fail(where, "must be a number");
        if (value < field.min || value > field.max) fail(where, `must be between ${field.min} and ${field.max}`);
        out[field.key] = value;
        break;
      }
      case "toggle":
        out[field.key] = raw === true;
        break;
      case "select": {
        const value = clean(raw, 80);
        if (!field.options.some((option) => option.value === value)) fail(where, "has an invalid choice");
        out[field.key] = value;
        break;
      }
      case "strings": {
        const list = Array.isArray(raw) ? raw : [];
        if (list.length > (field.maxItems ?? 40)) fail(where, `can have at most ${field.maxItems ?? 40} items`);
        const items = list.map((item) => clean(item, field.max ?? 400, field.multiline)).filter(Boolean);
        if (field.required && items.length === 0) fail(where, "needs at least one item");
        out[field.key] = items;
        break;
      }
      case "group":
        out[field.key] = validateFields(field.fields, raw, where);
        break;
      case "list": {
        const list = Array.isArray(raw) ? raw : [];
        if (list.length > (field.maxItems ?? 100)) fail(where, `can have at most ${field.maxItems ?? 100} items`);
        out[field.key] = list.map((item, index) => validateFields(field.fields, item, `${where} #${index + 1}`));
        break;
      }
    }
  }
  return out;
}

/** Deep-merges stored values over defaults (objects merge, everything else replaces). */
export function mergeDefaults<T>(defaults: T, stored: unknown): T {
  if (stored === undefined || stored === null) return defaults;
  if (Array.isArray(defaults)) return (Array.isArray(stored) ? stored : defaults) as T;
  if (typeof defaults !== "object" || defaults === null) {
    return (typeof stored === typeof defaults ? stored : defaults) as T;
  }
  if (typeof stored !== "object" || Array.isArray(stored)) return defaults;
  const result: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };
  for (const [key, value] of Object.entries(stored as Record<string, unknown>)) {
    result[key] = key in result ? mergeDefaults(result[key], value) : value;
  }
  return result as T;
}
