import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { MOCK_KEY_ID, MOCK_SIGNATURE, parseMockPaymentId } from "@/lib/payments/mock";
import { requireEnv } from "@/lib/server/core/env";

/** Local-only fake payments (no Razorpay account needed). Never in production, and real keys always win. */
const MOCK = process.env.NODE_ENV !== "production" && process.env.MOCK_PAYMENTS === "1" && !process.env.RAZORPAY_KEY_ID;
if (MOCK) console.warn("[payments] MOCK_PAYMENTS is on: payments are simulated, no money moves.");

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
  return MOCK ? MOCK_KEY_ID : requireEnv("RAZORPAY_KEY_ID");
}

export function createOrder(opts: { amount: number; receipt: string; notes?: Record<string, string> }) {
  if (MOCK) return Promise.resolve({ id: `order_MOCK${randomBytes(4).toString("hex")}`, amount: opts.amount });
  return call<{ id: string; amount: number }>("/orders", {
    method: "POST",
    body: { amount: opts.amount, currency: "INR", receipt: opts.receipt, notes: opts.notes },
  });
}

export type RzpPayment = { id: string; order_id: string; amount: number; status: string; currency: string; amount_refunded?: number };

export function fetchPayment(id: string): Promise<RzpPayment> {
  if (MOCK) {
    const mock = parseMockPaymentId(id);
    if (!mock) return Promise.reject(new Error("Unknown mock payment"));
    return Promise.resolve({ id, order_id: mock.orderId, amount: mock.amount, status: "captured", currency: "INR" });
  }
  return call<RzpPayment>(`/payments/${encodeURIComponent(id)}`);
}

export function capturePayment(id: string, amount: number): Promise<RzpPayment> {
  if (MOCK) return fetchPayment(id);
  return call<RzpPayment>(`/payments/${encodeURIComponent(id)}/capture`, {
    method: "POST",
    body: { amount, currency: "INR" },
  });
}

/**
 * Sends the customer's money back through Razorpay (a real refund to their original card / UPI / bank).
 * Safe to call again: if Razorpay says it cannot refund because the payment is already refunded (a double click,
 * or a crash after the refund went through), that is treated as done instead of an error.
 */
export async function refundPayment(paymentId: string, amount: number): Promise<{ id: string }> {
  if (MOCK) return { id: `rfnd_MOCK${randomBytes(4).toString("hex")}` };
  try {
    return await call<{ id: string }>(`/payments/${encodeURIComponent(paymentId)}/refund`, {
      method: "POST",
      body: { amount, speed: "normal", notes: { reason: "Booking cancelled by customer" } },
    });
  } catch (error) {
    const payment = await fetchPayment(paymentId).catch(() => null);
    if (payment && (payment.status === "refunded" || (payment.amount_refunded ?? 0) >= amount)) return { id: "already_refunded" };
    throw error;
  }
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  if (MOCK) return signature === MOCK_SIGNATURE;
  const expected = createHmac("sha256", requireEnv("RAZORPAY_KEY_SECRET")).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(expected, signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string) {
  const expected = createHmac("sha256", requireEnv("RAZORPAY_WEBHOOK_SECRET")).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}
