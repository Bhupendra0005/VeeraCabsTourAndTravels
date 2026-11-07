import { TRIP_TYPES, type BookingTripType, type PayMode } from "@/lib/booking/config";
import { createBooking } from "@/lib/server/bookings/service";
import { requireSession } from "@/lib/server/auth/guard";
import { assertSameOrigin, handle, HttpError, json, readJson } from "@/lib/server/core/http";
import { email, hhmm, isoDate, optStr, phone, str, uuid } from "@/lib/server/core/validate";

export const runtime = "nodejs";

export function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const session = await requireSession();
    const body = await readJson(request);

    const tripType = body.tripType as BookingTripType;
    if (!TRIP_TYPES.includes(tripType)) throw new HttpError(400, "Invalid trip type.");
    const payMode = body.payMode as PayMode;
    if (payMode !== "part" && payMode !== "full") throw new HttpError(400, "Invalid payment option.");
    if (body.acceptTerms !== true) {
      throw new HttpError(400, "Please accept the Terms & Conditions to continue.");
    }
    const passengers = Number(body.passengers);
    if (!Number.isInteger(passengers) || passengers < 1 || passengers > 20) {
      throw new HttpError(400, "Invalid number of passengers.");
    }

    const order = await createBooking(session.customerId, {
      routeId: uuid(body.routeId, "route"),
      vehicle: str(body, "vehicle", 2, 40),
      tripType,
      date: isoDate(body.date, "travel date"),
      time: hhmm(body.time),
      returnDate: tripType === "round_trip" ? isoDate(body.returnDate, "return date") : null,
      passengers,
      pickupAddress: str(body, "pickupAddress", 3, 160),
      dropAddress: optStr(body, "dropAddress", 120),
      name: str(body, "name", 2, 80),
      phone: phone(body.phone),
      email: email(body.email),
      insurance: body.insurance === true,
      payMode,
    });
    return json(order, 201);
  });
}
