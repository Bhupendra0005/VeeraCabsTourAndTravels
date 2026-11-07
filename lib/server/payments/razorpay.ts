import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { requireEnv } from "@/lib/server/core/env";

const API = "https://api.razorpay.com/v1";

function authHeader() {
  const token = Buffer.from(`${requireEnv("RAZORPAY_KEY_ID")}:${requireEnv("RAZORPAY_KEY_SECRET")}`).toString("base64");
  return `Basic ${token}`;
}

async function call<T>(path: string, init?: { method: string; body: unknown }): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init?.method ?? "GET",
    headers: { authorization: authHeader(), "content-type": "application/json" },
    body: init ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { description?: string } };
  if (!res.ok) {
    console.error("Razorpay error", path, res.status, data.error?.description);
    throw new Error("Payment provider error");
  }
  return data;
}

/** The key id is public (it is sent to the browser for Checkout); the secret never leaves the server. */
export function publicKeyId() {
  return requireEnv("RAZORPAY_KEY_ID");
}

export function createOrder(opts: { amount: number; receipt: string; notes?: Record<string, string> }) {
  return call<{ id: string; amount: number }>("/orders", {
    method: "POST",
    body: { amount: opts.amount, currency: "INR", receipt: opts.receipt, notes: opts.notes },
  });
}

export type RzpPayment = { id: string; order_id: string; amount: number; status: string; currency: string };

export function fetchPayment(id: string) {
  return call<RzpPayment>(`/payments/${encodeURIComponent(id)}`);
}

export function capturePayment(id: string, amount: number) {
  return call<RzpPayment>(`/payments/${encodeURIComponent(id)}/capture`, {
    method: "POST",
    body: { amount, currency: "INR" },
  });
}

export function refundPayment(paymentId: string, amount: number) {
  return call<{ id: string }>(`/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: "POST",
    body: { amount, speed: "normal" },
  });
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  const expected = createHmac("sha256", requireEnv("RAZORPAY_KEY_SECRET")).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(expected, signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string) {
  const expected = createHmac("sha256", requireEnv("RAZORPAY_WEBHOOK_SECRET")).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}
