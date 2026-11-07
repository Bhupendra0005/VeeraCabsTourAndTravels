"use client";

import { CheckCircle2, Mail, MapPin, Phone, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import {
  buildQuote,
  describeMinutes,
  formatINR,
  type BookingTripType,
  type PricingRules,
  type PayMode,
} from "@/lib/booking/config";
import { openCheckout, postJson, verifyPayment, type PayOrder } from "@/lib/payments/checkout-client";
import { ui } from "@/components/ui/styles";
import { cn } from "@/lib/utils/cn";

type Props = {
  routeId: string;
  vehicle: string;
  tripType: BookingTripType;
  date: string;
  time: string;
  returnDate: string;
  passengers: number;
  baseFare: number;
  rules: PricingRules & { balanceCutoffHours: number };
  defaultEmail: string;
  loginPath: string;
};

export function ReviewForm(props: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(props.defaultEmail);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropAddress, setDropAddress] = useState("");
  const [insurance, setInsurance] = useState(false);
  const [payMode, setPayMode] = useState<PayMode>("part");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingBooking, setPendingBooking] = useState("");

  // display only: the server recomputes the price from its own fare table
  const part = useMemo(() => buildQuote({ baseFare: props.baseFare, withInsurance: insurance, payMode: "part" }, props.rules), [props.baseFare, props.rules, insurance]);
  const full = useMemo(() => buildQuote({ baseFare: props.baseFare, withInsurance: insurance, payMode: "full" }, props.rules), [props.baseFare, props.rules, insurance]);
  const quote = payMode === "full" ? full : part;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!/^[6-9]\d{9}$/.test(phone)) return setError("Enter a valid 10-digit mobile number.");
    if (!accepted) return setError("Please accept the Terms & Conditions to continue.");

    setBusy(true);
    setError("");
    setPendingBooking("");
    try {
      const order = await postJson<PayOrder>("/api/bookings", {
        routeId: props.routeId,
        vehicle: props.vehicle,
        tripType: props.tripType,
        date: props.date,
        time: props.time,
        returnDate: props.tripType === "round_trip" ? props.returnDate : undefined,
        passengers: props.passengers,
        pickupAddress,
        dropAddress,
        name,
        phone,
        email,
        insurance,
        payMode,
        acceptTerms: accepted,
      });

      const result = await openCheckout(order, { name, email, contact: `+91${phone}` });
      if (!result) {
        setPendingBooking(order.bookingId);
        setError("Payment was not completed. Your booking is saved, you can finish paying from My Bookings.");
        setBusy(false);
        return;
      }
      await verifyPayment(result);
      router.replace(`/bookings/${order.bookingId}?paid=1`);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 401) {
        router.push(props.loginPath);
        return;
      }
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form className={ui.reviewGrid} onSubmit={submit} noValidate>
      <div className={ui.stack}>
        <section className={ui.card}>
          <h2 className={ui.cardTitle}>Traveller details</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="rv-name">Full name</label>
              <div className="field-control">
                <User aria-hidden="true" />
                <input id="rv-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} required />
              </div>
            </div>
            <div className="field">
              <label htmlFor="rv-phone">Mobile number</label>
              <div className="field-control">
                <Phone aria-hidden="true" />
                <input
                  id="rv-phone"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit mobile number"
                  autoComplete="tel-national"
                  maxLength={10}
                  required
                />
              </div>
            </div>
            <div className="field field-full">
              <label htmlFor="rv-email">Email (your ticket is sent here)</label>
              <div className="field-control">
                <Mail aria-hidden="true" />
                <input id="rv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={254} required />
              </div>
            </div>
            <div className="field field-full">
              <label htmlFor="rv-pickup">Pickup address</label>
              <div className="field-control">
                <MapPin aria-hidden="true" />
                <input id="rv-pickup" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} placeholder="House / landmark, area" maxLength={160} required />
              </div>
            </div>
            <div className="field field-full">
              <label htmlFor="rv-drop">Drop address (optional)</label>
              <div className="field-control">
                <MapPin aria-hidden="true" />
                <input id="rv-drop" value={dropAddress} onChange={(e) => setDropAddress(e.target.value)} placeholder="Where should we drop you?" maxLength={120} />
              </div>
            </div>
          </div>
        </section>

        {props.rules.insuranceEnabled ? (
        <section className={ui.card}>
          <label className={ui.check}>
            <input type="checkbox" checked={insurance} onChange={(e) => setInsurance(e.target.checked)} />
            <span>
              <b>
                <ShieldCheck aria-hidden="true" /> Add trip protection for {formatINR(Math.round(props.rules.insuranceRupees * 100))}
              </b>
              <small>Optional cover for your journey. Recommended for long trips.</small>
            </span>
          </label>
        </section>
        ) : null}
      </div>

      <aside className={ui.stack}>
        <section className={ui.card}>
          <h2 className={ui.cardTitle}>Fare summary</h2>
          <dl className={ui.fareBreakdown}>
            <div>
              <dt>Base fare</dt>
              <dd>{formatINR(quote.baseFare)}</dd>
            </div>
            <div>
              <dt>GST ({props.rules.gstPercent}%)</dt>
              <dd>{formatINR(quote.gst)}</dd>
            </div>
            {quote.insurance > 0 ? (
              <div>
                <dt>Trip protection</dt>
                <dd>{formatINR(quote.insurance)}</dd>
              </div>
            ) : null}
            <div className={ui.fareTotal}>
              <dt>Total</dt>
              <dd>{formatINR(quote.total)}</dd>
            </div>
          </dl>

          <fieldset className={ui.payOptions}>
            <legend className="sr-only">Payment option</legend>
            <label className={cn(ui.payOption, payMode === "part" && ui.payOptionActive)}>
              <input type="radio" name="payMode" checked={payMode === "part"} onChange={() => setPayMode("part")} />
              <span>
                <b>Part pay {formatINR(part.payNow)}</b>
                <small>{props.rules.partPayPercent}% now, rest {formatINR(part.total - part.payNow)} later</small>
              </span>
            </label>
            <label className={cn(ui.payOption, payMode === "full" && ui.payOptionActive)}>
              <input type="radio" name="payMode" checked={payMode === "full"} onChange={() => setPayMode("full")} />
              <span>
                <b>Full pay {formatINR(full.total)}</b>
                <small>Nothing left to pay later</small>
              </span>
            </label>
          </fieldset>
          {payMode === "part" ? (
            <p className={ui.muted}>
              Pay the balance online until {describeMinutes(props.rules.balanceCutoffHours * 60)} before departure, or to the driver at the end of the trip.
            </p>
          ) : null}

          <label className={cn(ui.check, ui.terms)}>
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
            <span>
              I agree to the{" "}
              <Link href="/terms" target="_blank">
                Terms &amp; Conditions
              </Link>{" "}
              and{" "}
              <Link href="/cancellation-policy" target="_blank">
                Cancellation Policy
              </Link>
              .
            </span>
          </label>

          {error ? (
            <p className="field-error" role="alert">
              {error}{" "}
              {pendingBooking ? <Link href={`/bookings/${pendingBooking}`}>Open booking</Link> : null}
            </p>
          ) : null}

          <button type="submit" className={cn("btn btn-gold", ui.payButton)} disabled={busy}>
            <CheckCircle2 aria-hidden="true" />
            {busy ? "Please wait..." : `Pay ${formatINR(quote.payNow)}`}
          </button>
          <p className={ui.secureNote}>
            <ShieldCheck aria-hidden="true" /> Secure payment by Razorpay. We never see your card details.
          </p>
        </section>
      </aside>
    </form>
  );
}
