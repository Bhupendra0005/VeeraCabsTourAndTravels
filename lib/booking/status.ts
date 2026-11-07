export type BookingStatusKey = "pending_payment" | "confirmed" | "cancelled" | "completed" | "payment_failed";

export const STATUS_LABEL: Record<BookingStatusKey, string> = {
  pending_payment: "Payment pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
  payment_failed: "Payment failed",
};

/** Badge colours per status (Tailwind). */
export const STATUS_CLASS: Record<BookingStatusKey, string> = {
  pending_payment: "bg-yellow-400/15 text-yellow-400",
  confirmed: "bg-ok/15 text-ok",
  completed: "bg-ok/15 text-ok",
  cancelled: "bg-red-400/15 text-red-400",
  payment_failed: "bg-red-400/15 text-red-400",
};
