import "server-only";
import { randomInt } from "node:crypto";
import {
  buildQuote,
  cancellationOutcome,
  departureAt,
  describeMinutes,
  type BookingTripType,
  type PayMode,
} from "@/lib/booking/config";
import { getBookingSettings, getFleet } from "@/lib/server/cms/content";
import { sendEmail } from "@/lib/server/email/brevo";
import { db } from "@/lib/server/core/db";
import { cancellationEmail, confirmationEmail } from "@/lib/server/email/templates";
import { HttpError } from "@/lib/server/core/http";
import { documentContext } from "@/lib/server/bookings/context";
import { buildInvoicePdf, buildTicketPdf } from "@/lib/server/bookings/pdf";
import {
  capturePayment,
  createOrder,
  fetchPayment,
  publicKeyId,
  refundPayment,
} from "@/lib/server/payments/razorpay";
import {
  BOOKING_COLUMNS,
  PAYMENT_COLUMNS,
  amountPaid,
  type BookingRow,
  type PaymentRow,
} from "@/lib/server/bookings/types";

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const MAX_PENDING_PER_HOUR = 5;
const ORDER_REUSE_MS = 20 * 60_000;

function makeRef(): string {
  let ref = "VT";
  for (let i = 0; i < 8; i += 1) ref += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return ref;
}

export type RouteFare = {
  routeId: string;
  fromCity: string;
  toCity: string;
  distanceKm: number;
  durationHours: number;
  vehicle: string;
  /** Base fare in paise for the requested trip type. */
  fare: number;
};

type FareJoin = {
  vehicle_type: string;
  fare_one_way: number;
  fare_round_trip: number | null;
  routes: { id: string; from_city: string; to_city: string; distance_km: number; duration_hours: number } | null;
};

function toRouteFare(row: FareJoin, tripType: BookingTripType): RouteFare | null {
  if (!row.routes) return null;
  const fare = tripType === "round_trip" ? (row.fare_round_trip ?? row.fare_one_way * 2) : row.fare_one_way;
  return {
    routeId: row.routes.id,
    fromCity: row.routes.from_city,
    toCity: row.routes.to_city,
    distanceKm: row.routes.distance_km,
    durationHours: Number(row.routes.duration_hours),
    vehicle: row.vehicle_type,
    fare,
  };
}

const FARE_SELECT =
  "vehicle_type, fare_one_way, fare_round_trip, routes!inner(id, from_city, to_city, distance_km, duration_hours, active)";

/** Fare for one vehicle on one route. The only place a booking price comes from. */
export async function lookupFare(routeId: string, vehicle: string, tripType: BookingTripType) {
  const { data, error } = await db()
    .from("route_fares")
    .select(FARE_SELECT)
    .eq("route_id", routeId)
    .eq("vehicle_type", vehicle)
    .eq("routes.active", true)
    .maybeSingle();
  if (error) throw error;
  return data ? toRouteFare(data as unknown as FareJoin, tripType) : null;
}

/** All vehicle fares for a from/to pair (for the search results). */
export async function searchFares(from: string, to: string, tripType: BookingTripType) {
  const { data: route, error } = await db()
    .from("routes")
    .select("id")
    .eq("from_city", from)
    .eq("to_city", to)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  if (!route) return [];

  const { data, error: fareError } = await db()
    .from("route_fares")
    .select(FARE_SELECT)
    .eq("route_id", route.id);
  if (fareError) throw fareError;
  return (data as unknown as FareJoin[])
    .map((row) => toRouteFare(row, tripType))
    .filter((fare): fare is RouteFare => fare !== null)
    .sort((a, b) => a.fare - b.fare);
}

export async function listCities(): Promise<{ from: string[]; to: Record<string, string[]> }> {
  const { data, error } = await db().from("routes").select("from_city, to_city").eq("active", true);
  if (error) throw error;
  const to: Record<string, string[]> = {};
  for (const row of data) (to[row.from_city] ??= []).push(row.to_city);
  for (const key of Object.keys(to)) to[key].sort();
  return { from: Object.keys(to).sort(), to };
}

/* ------------------------------------------------------------------ */
/* Ownership-checked loaders                                           */
/* ------------------------------------------------------------------ */

/** Returns the booking only if it belongs to the customer; otherwise 404 (no existence leak). */
export async function loadOwnedBooking(id: string, customerId: string): Promise<BookingRow> {
  const { data, error } = await db()
    .from("bookings")
    .select(BOOKING_COLUMNS)
    .eq("id", id)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Booking not found.");
  return data as unknown as BookingRow;
}

export async function loadPayments(bookingId: string): Promise<PaymentRow[]> {
  const { data, error } = await db()
    .from("payments")
    .select(PAYMENT_COLUMNS)
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as unknown as PaymentRow[];
}

export async function listCustomerBookings(customerId: string): Promise<BookingRow[]> {
  const { data, error } = await db()
    .from("bookings")
    .select(BOOKING_COLUMNS)
    .eq("customer_id", customerId)
    .neq("status", "payment_failed")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data as unknown as BookingRow[];
}

/* ------------------------------------------------------------------ */
/* Create booking + first payment order                                */
/* ------------------------------------------------------------------ */

export type BookingInput = {
  routeId: string;
  vehicle: string;
  tripType: BookingTripType;
  date: string;
  time: string;
  returnDate: string | null;
  passengers: number;
  pickupAddress: string;
  dropAddress: string;
  name: string;
  phone: string;
  email: string;
  insurance: boolean;
  payMode: PayMode;
};

export type CheckoutOrder = {
  bookingId: string;
  orderId: string;
  amount: number;
  keyId: string;
  ref: string;
};

export async function createBooking(customerId: string, input: BookingInput): Promise<CheckoutOrder> {
  const settings = await getBookingSettings();
  if (!settings.onlineBookingEnabled) throw new HttpError(503, settings.maintenanceMessage);

  const departure = departureAt(input.date, input.time);
  const now = Date.now();
  if (Number.isNaN(departure.getTime()) || departure.getTime() < now + settings.minLeadMinutes * 60_000) {
    throw new HttpError(400, `Please choose a pickup time at least ${describeMinutes(settings.minLeadMinutes)} from now.`);
  }
  if (departure.getTime() > now + 365 * 86_400_000) {
    throw new HttpError(400, "Bookings can be made up to one year ahead.");
  }
  if (input.tripType === "round_trip") {
    if (!input.returnDate || input.returnDate < input.date) {
      throw new HttpError(400, "Choose a return date on or after the travel date.");
    }
  }

  const vehicle = (await getFleet()).find((item) => item.title === input.vehicle);
  if (!vehicle) throw new HttpError(404, "This vehicle is not available.");
  if (input.passengers > vehicle.capacity) {
    throw new HttpError(400, `${vehicle.title} seats up to ${vehicle.capacity} passengers.`);
  }

  const fare = await lookupFare(input.routeId, input.vehicle, input.tripType);
  if (!fare) throw new HttpError(404, "This route or vehicle is not available.");

  // anti-abuse: unpaid bookings each create a payment order, so cap them per customer
  const { count, error: countError } = await db()
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .eq("status", "pending_payment")
    .gte("created_at", new Date(now - 3_600_000).toISOString());
  if (countError) throw countError;
  if ((count ?? 0) >= MAX_PENDING_PER_HOUR) {
    throw new HttpError(429, "You have several unpaid bookings. Please complete or wait before booking again.");
  }

  const quote = buildQuote({ baseFare: fare.fare, withInsurance: input.insurance, payMode: input.payMode }, settings);

  let booking: BookingRow | null = null;
  for (let attempt = 0; attempt < 4 && !booking; attempt += 1) {
    const { data, error } = await db()
      .from("bookings")
      .insert({
        ref: makeRef(),
        customer_id: customerId,
        route_id: fare.routeId,
        trip_type: input.tripType,
        from_city: fare.fromCity,
        to_city: fare.toCity,
        pickup_address: input.pickupAddress,
        drop_address: input.dropAddress,
        travel_date: input.date,
        travel_time: input.time,
        return_date: input.tripType === "round_trip" ? input.returnDate : null,
        passengers: input.passengers,
        vehicle_type: fare.vehicle,
        traveller_name: input.name,
        traveller_phone: input.phone,
        traveller_email: input.email,
        base_fare: quote.baseFare,
        gst: quote.gst,
        insurance: quote.insurance,
        total: quote.total,
        pay_mode: input.payMode,
        advance_due: quote.payNow,
        terms_accepted_at: new Date().toISOString(),
      })
      .select(BOOKING_COLUMNS)
      .single();
    if (error && error.code !== "23505") throw error; // 23505 = ref collision, retry
    booking = (data as unknown as BookingRow) ?? null;
  }
  if (!booking) throw new Error("Could not allocate a booking reference");

  try {
    return await newOrder(booking, input.payMode === "full" ? "full" : "advance", quote.payNow);
  } catch (error) {
    await db().from("bookings").delete().eq("id", booking.id); // nothing was charged
    throw error;
  }
}

async function newOrder(
  booking: BookingRow,
  kind: PaymentRow["kind"],
  amount: number,
): Promise<CheckoutOrder> {
  // reuse a recent unpaid order of the same amount: an order can only be paid once, so
  // double clicks and second tabs cannot cause a double charge
  const { data: existing, error } = await db()
    .from("payments")
    .select("razorpay_order_id, created_at")
    .eq("booking_id", booking.id)
    .eq("kind", kind)
    .eq("amount", amount)
    .eq("status", "created")
    .gte("created_at", new Date(Date.now() - ORDER_REUSE_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (existing) {
    return { bookingId: booking.id, orderId: existing.razorpay_order_id, amount, keyId: publicKeyId(), ref: booking.ref };
  }

  const order = await createOrder({ amount, receipt: booking.ref, notes: { booking: booking.ref, kind } });
  const { error: insertError } = await db().from("payments").insert({
    booking_id: booking.id,
    kind,
    amount,
    razorpay_order_id: order.id,
  });
  if (insertError) throw insertError;
  return { bookingId: booking.id, orderId: order.id, amount, keyId: publicKeyId(), ref: booking.ref };
}

/** Order for "complete payment" on a pending booking, or "pay balance" on a confirmed one. */
export async function startPayment(booking: BookingRow): Promise<CheckoutOrder> {
  const departure = departureAt(booking.travel_date, booking.travel_time).getTime();
  if (departure <= Date.now()) throw new HttpError(400, "This trip has already started.");

  if (booking.status === "pending_payment" || booking.status === "payment_failed") {
    return newOrder(booking, booking.pay_mode === "full" ? "full" : "advance", booking.advance_due);
  }
  if (booking.status !== "confirmed") throw new HttpError(400, "Payment is not possible for this booking.");

  const outstanding = booking.total - amountPaid(await loadPayments(booking.id));
  if (outstanding <= 0) throw new HttpError(400, "This booking is already fully paid.");
  const { balanceCutoffHours } = await getBookingSettings();
  if (departure - Date.now() < balanceCutoffHours * 3_600_000) {
    throw new HttpError(400, "Online balance payment has closed. Please pay the driver at the end of the trip.");
  }
  return newOrder(booking, "balance", outstanding);
}

/* ------------------------------------------------------------------ */
/* Payment confirmation (browser callback + webhook share this)         */
/* ------------------------------------------------------------------ */

/**
 * Marks a Razorpay payment as paid. Idempotent: the browser callback and the webhook may
 * both call it for the same payment, and only the first one does the work.
 */
export async function confirmPayment(orderId: string, razorpayPaymentId: string, razorpayAmount: number) {
  const { data: payment, error } = await db()
    .from("payments")
    .select(PAYMENT_COLUMNS)
    .eq("razorpay_order_id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!payment) throw new HttpError(404, "Payment not found.");
  const row = payment as unknown as PaymentRow;
  if (row.status === "paid" || row.status === "refunded") return;
  if (razorpayAmount !== row.amount) throw new HttpError(400, "Payment amount mismatch.");

  const { data: claimed, error: claimError } = await db()
    .from("payments")
    .update({ status: "paid", razorpay_payment_id: razorpayPaymentId, paid_at: new Date().toISOString() })
    .eq("id", row.id)
    .in("status", ["created", "failed"])
    .select("id");
  if (claimError) throw claimError;
  if (!claimed?.length) return; // another request got there first

  const { data: booking, error: bookingError } = await db()
    .from("bookings")
    .select(BOOKING_COLUMNS)
    .eq("id", row.booking_id)
    .single();
  if (bookingError) throw bookingError;
  const b = booking as unknown as BookingRow;

  if (b.status === "cancelled") {
    // money arrived after the customer cancelled: give it straight back
    const refund = await refundPayment(razorpayPaymentId, row.amount);
    await db().from("payments").update({ status: "refunded", refund_id: refund.id }).eq("id", row.id);
    return;
  }

  if (row.kind !== "balance" && (b.status === "pending_payment" || b.status === "payment_failed")) {
    const { data: confirmed, error: confirmError } = await db()
      .from("bookings")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", b.id)
      .in("status", ["pending_payment", "payment_failed"])
      .select(BOOKING_COLUMNS);
    if (confirmError) throw confirmError;
    if (confirmed?.length) {
      void sendConfirmation(confirmed[0] as unknown as BookingRow);
    }
  }
}

/** Server-side check of a checkout result against Razorpay itself (never trust browser-sent status). */
export async function verifyAndConfirm(orderId: string, razorpayPaymentId: string) {
  let rzp = await fetchPayment(razorpayPaymentId);
  if (rzp.order_id !== orderId) throw new HttpError(400, "Payment does not match this order.");
  if (rzp.status === "authorized") rzp = await capturePayment(razorpayPaymentId, rzp.amount);
  if (rzp.status !== "captured") throw new HttpError(402, "Payment has not completed.");
  await confirmPayment(orderId, razorpayPaymentId, rzp.amount);
}

/** Emails the ticket and invoice. Failures are logged, never thrown, so a payment is never failed by email trouble. */
export async function sendConfirmation(booking: BookingRow): Promise<boolean> {
  try {
    const payments = await loadPayments(booking.id);
    const ctx = await documentContext();
    const [ticket, invoice] = await Promise.all([
      buildTicketPdf(booking, payments, ctx),
      buildInvoicePdf(booking, payments, ctx),
    ]);
    await sendEmail({
      to: booking.traveller_email,
      ...confirmationEmail(ctx.site, ctx.rules, booking, amountPaid(payments)),
      attachments: [
        { name: `Ticket-${booking.ref}.pdf`, content: ticket },
        { name: `Invoice-${booking.ref}.pdf`, content: invoice },
      ],
    });
    return true;
  } catch (error) {
    // the booking is already confirmed and the ticket is downloadable; do not fail the payment
    console.error("Confirmation email failed", booking.ref, error);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Cancellation                                                        */
/* ------------------------------------------------------------------ */

/**
 * "policy": the customer rules (free until the cut-off, none after). The admin may override with a
 * full refund or no refund, and may cancel at any time.
 */
export type CancelMode = "policy" | "refund" | "no_refund";

export async function cancelBooking(booking: BookingRow, mode: CancelMode = "policy"): Promise<{ refunded: number }> {
  if (booking.status !== "confirmed" && booking.status !== "pending_payment") {
    throw new HttpError(400, "This booking cannot be cancelled.");
  }
  const { freeCancelMinutes } = await getBookingSettings();
  const outcome = cancellationOutcome(booking.travel_date, booking.travel_time, freeCancelMinutes);
  if (mode === "policy" && !outcome.allowed) throw new HttpError(400, outcome.reason);

  const refundable = mode === "policy" ? outcome.allowed && outcome.refundable : mode === "refund";
  let refunded = 0;
  if (refundable) {
    const paid = (await loadPayments(booking.id)).filter((p) => p.status === "paid" && p.razorpay_payment_id);
    for (const payment of paid) {
      const refund = await refundPayment(payment.razorpay_payment_id as string, payment.amount);
      await db().from("payments").update({ status: "refunded", refund_id: refund.id }).eq("id", payment.id);
      refunded += payment.amount;
    }
  }

  const { data: updated, error } = await db()
    .from("bookings")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), refund_amount: refunded })
    .eq("id", booking.id)
    .in("status", ["confirmed", "pending_payment"])
    .select(BOOKING_COLUMNS);
  if (error) throw error;
  if (!updated?.length) throw new HttpError(409, "This booking was already updated.");

  if (booking.status === "confirmed") {
    try {
      const ctx = await documentContext();
      await sendEmail({
        to: booking.traveller_email,
        ...cancellationEmail(ctx.site, ctx.rules, updated[0] as unknown as BookingRow, refunded),
      });
    } catch (emailError) {
      console.error("Cancellation email failed", booking.ref, emailError);
    }
  }
  return { refunded };
}

/** Marks a Razorpay payment attempt as failed (webhook). Never touches a paid payment. */
export async function markPaymentFailed(orderId: string) {
  await db().from("payments").update({ status: "failed" }).eq("razorpay_order_id", orderId).eq("status", "created");
}
