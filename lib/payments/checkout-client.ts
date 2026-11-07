/** Browser-side Razorpay Checkout helper. Only the public key id is used here. */

type CheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type CheckoutOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: "INR";
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (response: CheckoutResponse) => void;
  modal: { ondismiss: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: CheckoutOptions) => { open: () => void; on: (event: string, cb: () => void) => void };
  }
}

const SRC = "https://checkout.razorpay.com/v1/checkout.js";
let loading: Promise<void> | undefined;

function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = undefined;
      reject(new Error("Could not load the payment window. Check your connection and try again."));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export type PayOrder = { bookingId: string; orderId: string; amount: number; keyId: string; ref: string };

/** Opens Checkout. Resolves with the signed response, or null if the customer closed the window. */
export async function openCheckout(
  order: PayOrder,
  prefill: { name: string; email: string; contact: string },
): Promise<CheckoutResponse | null> {
  await loadScript();
  const Razorpay = window.Razorpay;
  if (!Razorpay) throw new Error("Payment window is unavailable.");

  return new Promise((resolve) => {
    const checkout = new Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: "INR",
      name: "Veera Tours & Travels",
      description: `Booking ${order.ref}`,
      prefill,
      theme: { color: "#0096db" },
      handler: (response) => resolve(response),
      modal: { ondismiss: () => resolve(null) },
    });
    checkout.open();
  });
}

/** POSTs JSON to our own API and returns the parsed body, throwing the server's message on failure. */
export async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    credentials: "same-origin",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    const error = new Error(data.error || "Something went wrong. Please try again.") as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return data;
}

export async function verifyPayment(response: CheckoutResponse) {
  await postJson("/api/payments/verify", response);
}
