/**
 * Fake payments for trying the whole booking flow on a laptop without Razorpay keys.
 * Switched on only by MOCK_PAYMENTS=1 in development AND when no RAZORPAY_KEY_ID is set (see
 * lib/server/payments/razorpay.ts). It can never be active in production, and real keys always win.
 */
export const MOCK_KEY_ID = "rzp_test_mock";
/** Stands in for the HMAC signature; the server accepts it only in mock mode. */
export const MOCK_SIGNATURE = "83f368ee4afc85b3df2b0626da08162605fec02b83d188525cbb05b976cc3766";

/** Mock payment ids carry the amount and the order, so the server can check them without a database lookup. */
export const mockPaymentId = (amount: number, orderId: string) => `pay_MOCK_${amount}_${orderId}`;

export function parseMockPaymentId(id: string): { amount: number; orderId: string } | null {
  const m = /^pay_MOCK_(\d{1,9})_(order_MOCK[a-f0-9]{8})$/.exec(id);
  return m ? { amount: Number(m[1]), orderId: m[2] } : null;
}
