"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/admin/action-state";
import { normaliseCode, type Coupon } from "@/lib/booking/config";
import { BOOKING_EXTRAS_FIELDS, BOOKING_EXTRAS_KEY, type BookingExtras } from "@/lib/booking/extras";
import { DocError, validateFields } from "@/lib/cms/validate";
import { audit } from "@/lib/server/admin/audit";
import { ActionError, run } from "@/lib/server/admin/actions/run";
import { readExtrasForEdit } from "@/lib/server/cms/extras";
import { writeDoc } from "@/lib/server/cms/store";
import type { Admin } from "@/lib/server/admin/session";

const CODE = /^[A-Z0-9]{3,20}$/;

/** What the coupon form sends. Everything is re-checked here; the browser's values are never trusted. */
export type CouponInput = {
  code: string;
  description: string;
  kind: string;
  value: number;
  maxDiscount: number;
  minFare: number;
  firstBookingOnly: boolean;
  maxUsesPerCustomer: number;
  maxUsesTotal: number;
  active: boolean;
};

/** Reads the booking offers, lets `change` edit the coupon list, validates the whole document and saves it. */
async function updateCoupons(admin: Admin, change: (coupons: Coupon[]) => Coupon[], message: string, detail: string): Promise<ActionState> {
  const extras: BookingExtras = await readExtrasForEdit();
  const coupons = change(extras.coupons.map((c) => ({ ...c })));
  let clean: Record<string, unknown>;
  try {
    clean = validateFields(BOOKING_EXTRAS_FIELDS, { ...extras, coupons });
  } catch (error) {
    if (error instanceof DocError) throw new ActionError(error.message);
    throw error;
  }
  await writeDoc(BOOKING_EXTRAS_KEY, clean, admin.email);
  await audit(admin, "content.saved", { entity: "content", entityId: `${BOOKING_EXTRAS_KEY}:${detail}` });
  // the booking pages are statically generated: refresh them so the coupon change is live straight away
  revalidatePath("/", "layout");
  return { ok: true, message };
}

function parse(input: CouponInput): Coupon {
  const code = normaliseCode(String(input?.code ?? ""));
  if (!CODE.test(code)) throw new ActionError("The coupon code needs 3 to 20 capital letters or numbers, with no spaces.");
  const description = String(input.description ?? "").replace(/\s+/g, " ").trim();
  if (description.length < 3) throw new ActionError("Write the offer text customers will see.");
  if (description.length > 120) throw new ActionError("The offer text can be at most 120 characters.");
  const kind = input.kind === "flat" ? "flat" : input.kind === "percent" ? "percent" : null;
  if (!kind) throw new ActionError("Choose the discount type.");
  const whole = (value: unknown, label: string, min: number, max: number) => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max) throw new ActionError(`${label} must be a whole number from ${min} to ${max}.`);
    return n;
  };
  const value = whole(input.value, "Discount", 1, kind === "percent" ? 90 : 100000);
  return {
    code,
    description,
    kind,
    value,
    maxDiscount: kind === "percent" ? whole(input.maxDiscount, "Maximum discount", 0, 100000) : 0,
    minFare: whole(input.minFare, "Minimum fare", 0, 1000000),
    active: input.active === true,
    firstBookingOnly: input.firstBookingOnly === true,
    maxUsesPerCustomer: whole(input.maxUsesPerCustomer, "Uses per customer", 0, 1000),
    maxUsesTotal: whole(input.maxUsesTotal, "Total uses", 0, 100000),
  };
}

/** Adds a coupon (`original` = null) or changes an existing one. */
export async function saveCouponAction(original: string | null, input: CouponInput): Promise<ActionState> {
  return run("content.manage", async (admin) => {
    const coupon = parse(input);
    return updateCoupons(
      admin,
      (coupons) => {
        const at = original === null ? -1 : coupons.findIndex((c) => normaliseCode(c.code) === normaliseCode(original));
        if (original !== null && at === -1) throw new ActionError("This coupon no longer exists. Refresh the page.");
        if (coupons.some((c, i) => i !== at && normaliseCode(c.code) === coupon.code)) throw new ActionError(`The code ${coupon.code} is already used by another coupon.`);
        if (at === -1) coupons.push(coupon);
        else coupons[at] = coupon;
        return coupons;
      },
      original === null ? `Coupon ${coupon.code} added.` : `Coupon ${coupon.code} saved.`,
      `coupon:${coupon.code}`,
    );
  });
}

/** Switches a coupon on or off without touching anything else. */
export async function setCouponActiveAction(code: string, active: boolean): Promise<ActionState> {
  return run("content.manage", async (admin) =>
    updateCoupons(
      admin,
      (coupons) => {
        const found = coupons.find((c) => normaliseCode(c.code) === normaliseCode(String(code)));
        if (!found) throw new ActionError("This coupon no longer exists. Refresh the page.");
        found.active = active === true;
        return coupons;
      },
      active ? "Coupon switched on." : "Coupon switched off.",
      `coupon:${normaliseCode(String(code))}`,
    ),
  );
}

/** Removes a coupon. Bookings that already used it keep their discount. */
export async function deleteCouponAction(code: string): Promise<ActionState> {
  return run("content.manage", async (admin) =>
    updateCoupons(
      admin,
      (coupons) => {
        const rest = coupons.filter((c) => normaliseCode(c.code) !== normaliseCode(String(code)));
        if (rest.length === coupons.length) throw new ActionError("This coupon no longer exists. Refresh the page.");
        return rest;
      },
      "Coupon deleted.",
      `coupon:${normaliseCode(String(code))}`,
    ),
  );
}
