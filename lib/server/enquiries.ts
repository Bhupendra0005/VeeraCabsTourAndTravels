import "server-only";
import { db } from "@/lib/server/core/db";
import { HttpError } from "@/lib/server/core/http";

export const ENQUIRY_TOPICS = [
  "Local car hire in Pune",
  "Outstation trip",
  "Airport pickup / drop",
  "Tour package",
  "Corporate or event travel",
  "Something else",
] as const;

export type EnquiryStatus = "new" | "contacted" | "closed";
export const ENQUIRY_STATUSES: EnquiryStatus[] = ["new", "contacted", "closed"];

export type EnquiryRow = {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  topic: string;
  message: string;
  status: EnquiryStatus;
  source: string;
};

const MAX_PER_IP_PER_HOUR = 5;
const MAX_PER_PHONE_PER_DAY = 5;

/** Stores one enquiry. Already validated by the caller; here we only limit abuse. */
export async function createEnquiry(input: { name: string; phone: string; topic: string; message: string; source: string }, ipHash: string | undefined) {
  if (ipHash) {
    const since = new Date(Date.now() - 60 * 60_000).toISOString();
    const { count, error } = await db().from("enquiries").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since);
    if (error) throw error;
    if ((count ?? 0) >= MAX_PER_IP_PER_HOUR) throw new HttpError(429, "Too many enquiries from this connection. Please call us instead.");
  }
  const day = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const { count: byPhone, error: phoneError } = await db().from("enquiries").select("id", { count: "exact", head: true }).eq("phone", input.phone).gte("created_at", day);
  if (phoneError) throw phoneError;
  if ((byPhone ?? 0) >= MAX_PER_PHONE_PER_DAY) throw new HttpError(429, "We already have your enquiries and will reply soon.");

  const { error } = await db()
    .from("enquiries")
    .insert({ ...input, ip_hash: ipHash ?? null });
  if (error) throw error;
}

export async function listEnquiries(status?: EnquiryStatus): Promise<EnquiryRow[]> {
  let query = db().from("enquiries").select("id, created_at, name, phone, topic, message, status, source").order("created_at", { ascending: false }).limit(300);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as EnquiryRow[];
}

export async function countNewEnquiries(): Promise<number> {
  const { count, error } = await db().from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new");
  if (error) throw error;
  return count ?? 0;
}
