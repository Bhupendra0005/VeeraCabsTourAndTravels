import "server-only";
import { db } from "@/lib/server/core/db";
import { HttpError } from "@/lib/server/core/http";
import { optStr, phone as validPhone, str } from "@/lib/server/core/validate";

export type Profile = {
  email: string;
  name: string;
  phone: string;
  city: string;
  createdAt: string | null;
};

export type ProfileInput = { name: string; phone: string; city: string };

/** Postgres "undefined column": migration 004 has not been applied yet. */
const MISSING_COLUMN = "42703";

/** Validates profile fields from a request body. `city` is optional. */
export function parseProfile(body: Record<string, unknown>): ProfileInput {
  return {
    name: str(body, "name", 2, 80),
    phone: validPhone(body.phone),
    city: optStr(body, "city", 80),
  };
}

export async function getProfile(customerId: string, email: string): Promise<Profile> {
  const { data, error } = await db()
    .from("customers")
    .select("email, name, phone, city, created_at")
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    // before migration 004 the page still works, just with empty details
    if (error.code === MISSING_COLUMN) return { email, name: "", phone: "", city: "", createdAt: null };
    throw error;
  }
  return {
    email: data?.email ?? email,
    name: data?.name ?? "",
    phone: data?.phone ?? "",
    city: data?.city ?? "",
    createdAt: data?.created_at ?? null,
  };
}

export async function updateProfile(customerId: string, input: ProfileInput): Promise<void> {
  const { error } = await db()
    .from("customers")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", customerId);
  if (error) {
    if (error.code === MISSING_COLUMN) {
      throw new HttpError(503, "Profiles are not enabled yet. Please try again later.");
    }
    throw error;
  }
}

/** Sign-up: fills name and phone only where they are still blank, so a login can never overwrite saved details. */
export async function fillProfileIfBlank(customerId: string, input: Pick<ProfileInput, "name" | "phone">): Promise<void> {
  const { error } = await db()
    .from("customers")
    .update({ name: input.name, phone: input.phone, updated_at: new Date().toISOString() })
    .eq("id", customerId)
    .eq("name", "")
    .eq("phone", "");
  if (error && error.code !== MISSING_COLUMN) throw error;
}
