import "server-only";
import type { BookingTripType, PayMode } from "@/lib/booking/config";

export type BookingStatus = "pending_payment" | "confirmed" | "cancelled" | "completed" | "payment_failed";

export type BookingRow = {
  id: string;
  ref: string;
  invoice_no: string;
  customer_id: string;
  route_id: string;
  trip_type: BookingTripType;
  from_city: string;
  to_city: string;
  pickup_address: string;
  drop_address: string;
  travel_date: string;
  travel_time: string;
  return_date: string | null;
  passengers: number;
  vehicle_type: string;
  traveller_name: string;
  traveller_phone: string;
  traveller_email: string;
  base_fare: number;
  gst: number;
  insurance: number;
  total: number;
  pay_mode: PayMode;
  advance_due: number;
  status: BookingStatus;
  confirmed_at: string | null;
  cancelled_at: string | null;
  refund_amount: number;
  created_at: string;
  /** Staff-only note; only loaded by admin queries. */
  admin_note?: string;
};

export type PaymentRow = {
  id: string;
  booking_id: string;
  kind: "advance" | "full" | "balance";
  amount: number;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  status: "created" | "paid" | "failed" | "refunded";
  refund_id: string | null;
  created_at: string;
  paid_at: string | null;
};

export const BOOKING_COLUMNS =
  "id, ref, invoice_no, customer_id, route_id, trip_type, from_city, to_city, pickup_address, drop_address, travel_date, travel_time, return_date, passengers, vehicle_type, traveller_name, traveller_phone, traveller_email, base_fare, gst, insurance, total, pay_mode, advance_due, status, confirmed_at, cancelled_at, refund_amount, created_at";

export const ADMIN_BOOKING_COLUMNS = `${BOOKING_COLUMNS}, admin_note`;

export const PAYMENT_COLUMNS =
  "id, booking_id, kind, amount, razorpay_order_id, razorpay_payment_id, status, refund_id, created_at, paid_at";

export function amountPaid(payments: PaymentRow[]): number {
  return payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
}
