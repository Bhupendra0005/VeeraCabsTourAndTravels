import { GENDERS, TRIP_TYPES, isOutstation, type BookingTripType, type Gender, type PayMode } from "@/lib/booking/config";
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

    const bags = body.bags === undefined ? 0 : Number(body.bags);
    if (!Number.isInteger(bags) || bags < 0 || bags > 20) throw new HttpError(400, "Invalid number of bags.");
    const gender = (body.gender ?? "") as Gender | "";
    if (gender !== "" && !GENDERS.includes(gender)) throw new HttpError(400, "Invalid gender.");
    const addons = body.addons ?? [];
    if (!Array.isArray(addons) || addons.length > 10 || addons.some((item) => typeof item !== "string" || item.length > 40)) {
      throw new HttpError(400, "Invalid special requests.");
    }

    const stops = body.stops ?? [];
    if (!Array.isArray(stops) || stops.length > 10 || stops.some((item) => typeof item !== "string" || item.trim().length < 2 || item.length > 60)) {
      throw new HttpError(400, "Invalid stops.");
    }
    const gstin = optStr(body, "gstin", 15).toUpperCase();

    const order = await createBooking(session.customerId, {
      routeId: isOutstation(tripType) ? uuid(body.routeId, "route") : "",
      from: optStr(body, "from", 40),
      airport: optStr(body, "airport", 60),
      pkg: optStr(body, "pkg", 30),
      stops: (stops as string[]).map((item) => item.trim()),
      gstCompany: optStr(body, "gstCompany", 80),
      gstin,
      vehicle: str(body, "vehicle", 2, 40),
      tripType,
      date: isoDate(body.date, "travel date"),
      time: hhmm(body.time),
      returnDate: tripType === "round_trip" ? isoDate(body.returnDate, "return date") : null,
      passengers,
      bags,
      gender,
      addons: addons as string[],
      couponCode: optStr(body, "couponCode", 20),
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
