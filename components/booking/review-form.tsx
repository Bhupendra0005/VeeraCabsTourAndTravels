"use client";

import { ArrowRight, Building2, CarTaxiFront, CheckCircle2, ChevronDown, Info, Languages, Lock, Mail, MapPin, Phone, ShieldCheck, Sparkles, Tag, Ticket, User, Users, TriangleAlert, Wallet, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { LoginForm } from "@/components/auth/login-form";
import { cleanMobile } from "@/lib/utils/phone";
import { LocationField } from "@/components/booking/location-field";
import { SectionCard } from "@/components/booking/section-card";
import {
  GENDERS,
  GENDER_LABEL,
  buildQuote,
  couponDiscount,
  describeMinutes,
  formatINR,
  normaliseCode,
  type Addon,
  type BookingTripType,
  type Coupon,
  type Gender,
  type PricingRules,
  type PayMode,
} from "@/lib/booking/config";
import { openCheckout, postJson, verifyPayment, type PayOrder } from "@/lib/payments/checkout-client";
import { ui } from "@/components/ui/styles";
import { cn } from "@/lib/utils/cn";
import type { FareBreakup } from "@/lib/booking/outstation";

/** "Distance 51 km x ₹14/km"; for a round trip it also says how the billed km came about. */
function distanceLabel(b: FareBreakup): string {
  const rate = `₹${b.ratePerKm}/km`;
  if (b.tripType !== "round_trip") return `Distance ${b.km} km x ${rate}`;
  if (b.billedKm > b.km * 2) return `${b.billedKm} km (${b.days} days x ${b.minKmPerDay} km minimum) x ${rate}`;
  return `${b.billedKm} km (${b.km} km each way) x ${rate}`;
}

type Props = {
  routeId: string;
  /** Hourly rentals: the city. Outstation: the pickup place. */
  from: string;
  /** Outstation: the drop place. */
  to: string;
  airport: string;
  /** Hourly rentals: the package name. */
  pkg: string;
  /** Outstation: extra stops chosen in the search. */
  stops: string[];
  /** Price of one extra stop, in paise. */
  stopCharge: number;
  /** The customer's address typed in the airport search. */
  prefillAddress: string;
  /** Shows the optional "Add GST details" box. */
  gstEnabled: boolean;
  /** Flat service fee in paise (0 = none) and its name. */
  serviceFee: number;
  serviceFeeLabel: string;
  /** Coupon & Offers card on or off. */
  showCoupons: boolean;
  /** Suggest addresses while typing. */
  suggestions: boolean;
  /** The owner's own places, suggested when the online lookup has nothing or is down. */
  places: string[];
  /** False for a guest: the email-code login opens when they pay. */
  loggedIn: boolean;
  vehicle: string;
  tripType: BookingTripType;
  date: string;
  time: string;
  returnDate: string;
  passengers: number;
  bags: number;
  baseFare: number;
  /** Fare worked out from the distance: its lines are listed under Base Fare. */
  distanceBreakup?: FareBreakup;
  /** Driver allowance already inside the base fare (paise), per day and for the days of the trip. */
  allowance?: { perDay: number; days: number; total: number };
  rules: PricingRules & { balanceCutoffHours: number };
  addons: Addon[];
  coupons: Coupon[];
  /** Titles of the things the fare already includes, listed as "Included" in the fare break up. */
  inclusionTitles: string[];
  defaultEmail: string;
  /** From the signed-in customer's profile. */
  defaultName: string;
  defaultPhone: string;
  loginPath: string;
  /** Server-rendered trip, cab, inclusions and cancellation cards shown above the traveller form. */
  children: ReactNode;
};

export function ReviewForm(props: Props) {
  const router = useRouter();
  const [name, setName] = useState(props.defaultName);
  const [gender, setGender] = useState<Gender>("male");
  const [phone, setPhone] = useState(props.defaultPhone);
  const [email, setEmail] = useState(props.defaultEmail);
  const airportPickup = props.tripType === "airport_pickup";
  const airportDrop = props.tripType === "airport_drop";
  const hourly = props.tripType === "hourly";
  // outstation priced by distance: the places typed in the search are a good start for the exact pickup and drop address
  const typedPlaces = !hourly && !airportPickup && !airportDrop && !props.routeId;
  const [pickupAddress, setPickupAddress] = useState(airportPickup ? props.airport : airportDrop ? props.prefillAddress : typedPlaces ? props.from : "");
  const [dropAddress, setDropAddress] = useState(airportPickup ? props.prefillAddress : airportDrop ? props.airport : typedPlaces ? props.to : "");
  const [wantGst, setWantGst] = useState(false);
  const [gstCompany, setGstCompany] = useState("");
  const [gstin, setGstin] = useState("");
  const [authed, setAuthed] = useState(props.loggedIn);
  const [loginOpen, setLoginOpen] = useState(false);
  const [addonLabels, setAddonLabels] = useState<string[]>([]);
  const [insurance, setInsurance] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [payMode, setPayMode] = useState<PayMode>("part");
  // a fare by distance is explained from the start: the customer sees what the price is made of
  const [showBreakup, setShowBreakup] = useState(!!props.distanceBreakup);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingBooking, setPendingBooking] = useState("");
  const [toastKey, setToastKey] = useState(0);

  /** Show a problem as a toast at the top of the screen, where the customer is looking. */
  const fail = (message: string, fieldId?: string) => {
    setError(message);
    setToastKey((key) => key + 1);
    // take the customer to the field that needs fixing
    if (fieldId) {
      const field = document.getElementById(fieldId);
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => field?.focus({ preventScroll: true }), 350);
    }
  };

  // the toast closes by itself; a new problem (even the same text) restarts the timer
  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(""), 7000);
    return () => window.clearTimeout(timer);
  }, [error, toastKey]);

  const bestSaving = Math.max(0, ...props.coupons.map((item) => couponDiscount(item, props.baseFare)));
  const coupon = props.coupons.find((item) => normaliseCode(item.code) === couponCode) ?? null;
  const stopsTotal = props.stops.length * props.stopCharge;
  const addonsTotal =
    props.addons.filter((addon) => addonLabels.includes(addon.label)).reduce((sum, addon) => sum + Math.round(addon.rupees * 100), 0) + stopsTotal;
  const discount = coupon ? couponDiscount(coupon, props.baseFare) : 0;

  // display only: the server recomputes the price from its own fare table, add-ons and coupons
  const quoteFor = (mode: PayMode) =>
    buildQuote({ baseFare: props.baseFare, addons: addonsTotal, discount, serviceFee: props.serviceFee, withInsurance: insurance, payMode: mode }, props.rules);
  const part = quoteFor("part");
  const full = quoteFor("full");
  const quote = payMode === "full" ? full : part;

  const breakupLines = (
    <>
            {showBreakup ? (
              <dl className={cn(ui.fareBreakdown, "mt-3")}>
                <div>
                  <dt>Base Fare</dt>
                  <dd>{formatINR(quote.baseFare)}</dd>
                </div>
                {props.distanceBreakup ? (
                  <>
                    <div>
                      <dt className="pl-3 text-sm">{distanceLabel(props.distanceBreakup)}</dt>
                      <dd className="text-sm font-normal! text-muted">{formatINR(props.distanceBreakup.kmCharge)}</dd>
                    </div>
                    {props.distanceBreakup.returnCharge > 0 ? (
                      <div>
                        <dt className="pl-3 text-sm">One-way return charge ({props.distanceBreakup.returnPercent}%)</dt>
                        <dd className="text-sm font-normal! text-muted">{formatINR(props.distanceBreakup.returnCharge)}</dd>
                      </div>
                    ) : null}
                    {props.distanceBreakup.minFareTopUp > 0 ? (
                      <div>
                        <dt className="pl-3 text-sm">Minimum fare for this vehicle</dt>
                        <dd className="text-sm font-normal! text-muted">+{formatINR(props.distanceBreakup.minFareTopUp)}</dd>
                      </div>
                    ) : null}
                  </>
                ) : null}
                {props.allowance ? (
                  <div>
                    <dt className="pl-3 text-sm">
                      Driver allowance ({formatINR(props.allowance.perDay * 100)} x {props.allowance.days} {props.allowance.days === 1 ? "day" : "days"})
                    </dt>
                    <dd className="text-sm font-normal! text-muted">{formatINR(props.allowance.total)}</dd>
                  </div>
                ) : null}
                {props.inclusionTitles.map((title) => (
                  <div key={title}>
                    <dt className="text-sm">{title}</dt>
                    <dd className="text-sm font-normal! text-muted">Included</dd>
                  </div>
                ))}
                {quote.addons > 0 ? (
                  <div>
                    <dt>{props.stops.length > 0 ? "Extra stops & special requests" : "Special requests"}</dt>
                    <dd>{formatINR(quote.addons)}</dd>
                  </div>
                ) : null}
                {quote.discount > 0 ? (
                  <div>
                    <dt>Coupon discount{coupon ? ` (${coupon.code})` : ""}</dt>
                    <dd className="text-ok">-{formatINR(quote.discount)}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Taxes &amp; Fees</dt>
                  <dd>{formatINR(quote.gst + quote.serviceFee)}</dd>
                </div>
                <div>
                  <dt className="pl-3 text-sm">GST ({props.rules.gstPercent}%)</dt>
                  <dd className="text-sm font-normal! text-muted">{formatINR(quote.gst)}</dd>
                </div>
                {quote.serviceFee > 0 ? (
                  <div>
                    <dt className="pl-3 text-sm">{props.serviceFeeLabel || "Service Fee"}</dt>
                    <dd className="text-sm font-normal! text-muted">{formatINR(quote.serviceFee)}</dd>
                  </div>
                ) : null}
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
            ) : null}
            {showBreakup && props.distanceBreakup ? (
              <p className="mt-3 text-xs leading-relaxed text-muted">
                {props.distanceBreakup.returnCharge > 0
                  ? `A one-way fare adds ${props.distanceBreakup.returnPercent}% because the driver drives back empty. `
                  : props.distanceBreakup.tripType === "round_trip"
                    ? "A round trip counts the distance both ways. "
                    : ""}
                The fare is the road distance x the rate of the cab you choose.
              </p>
            ) : null}
    </>
  );

  const applyCoupon = async (rawCode: string) => {
    const code = normaliseCode(rawCode);
    if (!code) return;
    const found = props.coupons.find((item) => normaliseCode(item.code) === code);
    if (!found) return setCouponError("This coupon code is not valid.");
    if (couponDiscount(found, props.baseFare) <= 0) {
      return setCouponError(found.minFare > 0 ? `This coupon needs a fare of at least ₹${found.minFare.toLocaleString("en-IN")}.` : "This coupon does not apply to this trip.");
    }
    // the coupon's own rules (first booking only, usage limits) are checked on the server for a logged-in customer
    if (authed) {
      try {
        await postJson("/api/bookings/coupon", { code });
      } catch (e) {
        return setCouponError((e as Error).message);
      }
    }
    setCouponError("");
    setCouponCode(code);
    setCouponInput("");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (name.trim().length < 2) return fail("Enter the traveller's full name.", "rv-name");
    if (!/^[6-9]\d{9}$/.test(phone)) return fail("Enter a valid 10-digit mobile number.", "rv-phone");
    if (pickupAddress.trim().length < 3) return fail("Enter your pickup location.", "rv-pickup");
    if ((airportPickup || airportDrop) && (airportPickup ? dropAddress : pickupAddress).trim().length < 3) {
      return fail(airportPickup ? "Enter your drop location." : "Enter your pickup location.", airportPickup ? "rv-drop" : "rv-pickup");
    }
    if (wantGst) {
      if (gstCompany.trim().length < 2) return fail("Enter the company name for the GST invoice.", "rv-gst-company");
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin.trim().toUpperCase())) return fail("Enter a valid 15-character GSTIN.", "rv-gstin");
    }
    if (!accepted) return fail("Please accept the Terms & Conditions to continue.");
    setError("");
    // a guest signs in with an email code first (MakeMyTrip asks you to log in at this step too)
    if (!authed) return setLoginOpen(true);
    void book();
  };

  const book = async () => {
    setBusy(true);
    setError("");
    setPendingBooking("");
    try {
      const order = await postJson<PayOrder>("/api/bookings", {
        routeId: props.routeId,
        vehicle: props.vehicle,
        tripType: props.tripType,
        from: props.from,
        to: props.to,
        airport: props.airport,
        pkg: props.pkg,
        stops: props.stops,
        date: props.date,
        time: props.time,
        returnDate: props.tripType === "round_trip" ? props.returnDate : undefined,
        passengers: props.passengers,
        bags: props.bags,
        pickupAddress,
        dropAddress: hourly ? "" : dropAddress,
        name,
        gender,
        phone,
        email,
        addons: addonLabels,
        couponCode: coupon ? coupon.code : "",
        gstCompany: wantGst ? gstCompany.trim() : "",
        gstin: wantGst ? gstin.trim().toUpperCase() : "",
        insurance,
        payMode,
        acceptTerms: accepted,
      });

      const result = await openCheckout(order, { name, email, contact: `+91${phone}` });
      if (!result) {
        setPendingBooking(order.bookingId);
        fail("Payment was not completed. Your booking is saved, you can finish paying from My Bookings.");
        setBusy(false);
        return;
      }
      await verifyPayment(result);
      router.replace(`/bookings/${order.bookingId}?paid=1`);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 401) {
        // the session expired: ask for the email code again, the form keeps everything typed so far
        setAuthed(false);
        setLoginOpen(true);
        setBusy(false);
        return;
      }
      fail(err.message);
      setBusy(false);
    }
  };

  const toggleAddon = (label: string) =>
    setAddonLabels((current) => (current.includes(label) ? current.filter((item) => item !== label) : [...current, label]));

  return (
    <>
    <form className={ui.reviewGrid} onSubmit={submit} noValidate>
      <div className={ui.stack}>
        {props.children}

        {props.addons.length > 0 ? (
          <SectionCard icon={<Sparkles aria-hidden="true" />} title="Special Requests">
            <div className="rv-addons">
              {props.addons.map((addon) => {
                const Icon = /language|speak/i.test(addon.label) ? Languages : /roof|carrier|luggage|bag/i.test(addon.label) ? CarTaxiFront : Sparkles;
                return (
                  <label key={addon.label} className="rv-addon">
                    <input type="checkbox" checked={addonLabels.includes(addon.label)} onChange={() => toggleAddon(addon.label)} />
                    <span className="rv-addon-icon">
                      <Icon aria-hidden="true" />
                    </span>
                    <span className="rv-addon-text">
                      <b>{addon.label}</b>
                      {addon.description ? <small>{addon.description}</small> : null}
                    </span>
                    <span className="rv-price-pill">+ {formatINR(Math.round(addon.rupees * 100))}</span>
                  </label>
                );
              })}
            </div>
          </SectionCard>
        ) : null}

        <SectionCard icon={<User aria-hidden="true" />} title="Traveller Details">
          <div className="rv-addr">
            <div className="field">
              <label htmlFor="rv-pickup" className="rv-sub">
                <MapPin aria-hidden="true" /> {airportPickup ? "Pickup (airport)" : "Pickup Details"}
              </label>
              <div className="field-control">
                <MapPin aria-hidden="true" />
                <LocationField
                  id="rv-pickup"
                  value={pickupAddress}
                  onChange={setPickupAddress}
                  placeholder="House / landmark, area"
                  maxLength={160}
                  suggest={props.suggestions}
                  places={props.places}
                  required
                />
              </div>
            </div>
            {hourly ? null : (
              <div className="field">
                <label htmlFor="rv-drop" className="rv-sub">
                  <MapPin aria-hidden="true" /> {airportDrop ? "Drop (airport)" : airportPickup ? "Drop Location" : "Drop Location"}{" "}
                  {!airportDrop && !airportPickup ? <span className="bk-opt">(Optional)</span> : null}
                </label>
                <div className="field-control">
                  <MapPin aria-hidden="true" />
                  <LocationField
                    id="rv-drop"
                    value={dropAddress}
                    onChange={setDropAddress}
                    placeholder="Where should we drop you?"
                    maxLength={120}
                    suggest={props.suggestions}
                    places={props.places}
                  />
                </div>
              </div>
            )}
          </div>
          <p className="rv-sub rv-sub--title">
            <Phone aria-hidden="true" /> Traveller Contact Details
          </p>
          <div className="rv-contact">
            <div className="field">
              <label htmlFor="rv-name">Full Name</label>
              <div className="field-control">
                <User aria-hidden="true" />
                <input id="rv-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter full name" autoComplete="name" maxLength={80} required />
              </div>
            </div>
            <div className="field">
              <label htmlFor="rv-gender">Gender</label>
              <div className="field-control">
                <Users aria-hidden="true" />
                <select id="rv-gender" value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
                  {GENDERS.map((value) => (
                    <option key={value} value={value}>
                      {GENDER_LABEL[value]}
                    </option>
                  ))}
                </select>
                <ChevronDown className="field-chevron" aria-hidden="true" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="rv-phone">Mobile Number</label>
              <div className="field-control">
                <Phone aria-hidden="true" />
                <span className="text-sm font-semibold text-muted">+91</span>
                <input
                  id="rv-phone"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(cleanMobile(e.target.value))}
                  placeholder="Enter 10-digit number"
                  autoComplete="tel-national"
                  required
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="rv-email">
                Email ID <span className="bk-opt">(Ticket will be sent here)</span>
              </label>
              <div className="field-control">
                <Mail aria-hidden="true" />
                <input id="rv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email address" autoComplete="email" maxLength={254} required />
              </div>
            </div>
          </div>
        </SectionCard>

        {props.gstEnabled ? (
        <section className={ui.card}>
          <label className={ui.check}>
            <input type="checkbox" checked={wantGst} onChange={(e) => setWantGst(e.target.checked)} />
            <span>
              <b>
                <Building2 aria-hidden="true" /> Add GST details (optional)
              </b>
              <small>Get a GST invoice in your company name.</small>
            </span>
          </label>
          {wantGst ? (
            <div className="form-grid mt-3.5">
              <div className="field">
                <label htmlFor="rv-gst-company">Company name</label>
                <div className="field-control">
                  <Building2 aria-hidden="true" />
                  <input id="rv-gst-company" value={gstCompany} onChange={(e) => setGstCompany(e.target.value)} maxLength={80} autoComplete="organization" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="rv-gstin">GSTIN</label>
                <div className="field-control">
                  <Building2 aria-hidden="true" />
                  <input id="rv-gstin" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15))} placeholder="15-character GST number" maxLength={15} />
                </div>
              </div>
            </div>
          ) : null}
        </section>
        ) : null}

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

      <aside className="grid content-start gap-5 min-[860px]:self-stretch">
        {props.showCoupons ? (
        <SectionCard icon={<Tag aria-hidden="true" />} title="Coupon & Offers">
          {props.coupons.length > 0 ? (
            <fieldset className="rv-coupons">
              <legend className="sr-only">Available coupons</legend>
              {props.coupons.map((item) => {
                const code = normaliseCode(item.code);
                const off = couponDiscount(item, props.baseFare);
                const selected = couponCode === code;
                const recommended = off > 0 && off === bestSaving && props.coupons.filter((c) => couponDiscount(c, props.baseFare) === bestSaving).length === 1 && props.coupons.length > 1;
                return (
                  <label key={code} className={cn("rv-coupon", selected && "is-selected", off <= 0 && "is-off")}>
                    <input
                      type="radio"
                      name="coupon"
                      checked={selected}
                      onChange={() => applyCoupon(code)}
                      onClick={() => {
                        if (selected) setCouponCode("");
                      }}
                      disabled={off <= 0}
                    />
                    <span className="rv-coupon-body">
                      <span className="rv-coupon-top">
                        <b className="rv-code">{code}</b>
                        {recommended ? (
                          <em className="mmt-badge">
                            <CheckCircle2 aria-hidden="true" /> Recommended
                          </em>
                        ) : null}
                      </span>
                      <small>{item.description}</small>
                      {off <= 0 && item.minFare > 0 ? <small className="rv-warn">Valid on fares of ₹{item.minFare.toLocaleString("en-IN")} or more</small> : null}
                    </span>
                    {off > 0 ? <b className="rv-save">Save {formatINR(off)}</b> : null}
                  </label>
                );
              })}
            </fieldset>
          ) : null}
          <div className="rv-coupon-input">
            <div className="rv-coupon-field">
              <Ticket aria-hidden="true" />
              <input
                value={couponInput}
                onChange={(e) => {
                  setCouponInput(e.target.value.slice(0, 20));
                  setCouponError("");
                }}
                placeholder="Enter a coupon code"
                aria-label="Coupon code"
                maxLength={20}
              />
            </div>
            <button type="button" className="rv-apply" disabled={!couponInput.trim()} onClick={() => applyCoupon(couponInput)}>
              Apply
            </button>
          </div>
          {couponError ? (
            <p className="field-error" role="alert">
              {couponError}
            </p>
          ) : null}
          {coupon && discount > 0 ? (
            <p className="mt-2.5 text-sm font-semibold text-ok" role="status">
              Coupon {coupon.code} applied. You save {formatINR(discount)}.{" "}
              <button type="button" className={ui.linkButton} onClick={() => setCouponCode("")}>
                Remove
              </button>
            </p>
          ) : null}
        </SectionCard>
        ) : null}

        <div className="min-[860px]:sticky min-[860px]:top-24">
        <SectionCard icon={<Wallet aria-hidden="true" />} title="Payment Options">
          <fieldset className={ui.payOptions}>
            <legend className="sr-only">Payment option</legend>
            <label className={cn(ui.payOption, payMode === "part" && ui.payOptionActive)}>
              <input type="radio" name="payMode" checked={payMode === "part"} onChange={() => setPayMode("part")} />
              <span className="flex-1">
                <b className="flex justify-between gap-3">
                  <span className="flex flex-wrap items-center gap-2">Part Pay <em className="mmt-badge">Pay less now</em></span> <span>{formatINR(part.payNow)}</span>
                </b>
                <small>Pay rest to the driver ({formatINR(part.total - part.payNow)})</small>
              </span>
            </label>
            <label className={cn(ui.payOption, payMode === "full" && ui.payOptionActive)}>
              <input type="radio" name="payMode" checked={payMode === "full"} onChange={() => setPayMode("full")} />
              <span className="flex-1">
                <b className="flex justify-between gap-3">
                  <span className="flex flex-wrap items-center gap-2">Full Pay <em className="mmt-badge">No balance later</em></span> <span>{formatINR(full.total)}</span>
                </b>
                <small>Pay full amount now</small>
              </span>
            </label>
          </fieldset>
          {payMode === "part" ? (
            <p className="rv-info">
              <Info aria-hidden="true" />
              <span>
                {props.rules.partPayPercent}% now. Pay the balance to the driver at the end of the trip, or online until {describeMinutes(props.rules.balanceCutoffHours * 60)} before departure.
              </span>
            </p>
          ) : null}

          {props.distanceBreakup ? (
            <div className="mb-3">
              <p className="text-sm font-bold">Fare break up</p>
              {breakupLines}
            </div>
          ) : null}

          <div className="rv-total">
            <span>Total Fare (Incl. taxes)</span>
            <b>{formatINR(quote.total)}</b>
          </div>

          <label className={cn(ui.check, ui.terms)}>
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
            <span>
              <span>
                By proceeding to book, I agree to the{" "}
                <Link href="/terms" target="_blank">
                  Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link href="/cancellation-policy" target="_blank">
                  Cancellation Rules
                </Link>
                , and the{" "}
                <Link href="/privacy-policy" target="_blank">
                  Privacy Policy
                </Link>
                .
              </span>
            </span>
          </label>


          <button type="submit" className={cn("btn btn-gold mmt-pay rv-pay", ui.payButton)} disabled={busy}>
            <ShieldCheck aria-hidden="true" />
            {busy ? "Please wait..." : `Pay Now ${formatINR(quote.payNow)}`}
            {busy ? null : <ArrowRight aria-hidden="true" />}
          </button>
          <p className="rv-secure">
            <Lock aria-hidden="true" /> Secure payment by Razorpay. We never see your card details.
          </p>

          {!props.distanceBreakup ? (
            <>
            <button
              type="button"
              className={cn(ui.linkButton, "mt-4 inline-flex items-center gap-1")}
              aria-expanded={showBreakup}
              onClick={() => setShowBreakup((current) => !current)}
            >
              {showBreakup ? "Hide" : "View"} Fare Break up <ChevronDown className={cn("size-4 transition", showBreakup && "rotate-180")} aria-hidden="true" />
            </button>
              {breakupLines}
            </>
          ) : null}
        </SectionCard>
        </div>
      </aside>

      {/* phones: the total and the pay button stay in reach while scrolling the long form */}
      {/* the floating call / WhatsApp buttons are hidden on this page, so the bar uses the full width: total on the left, a big button on the right */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,27,45,0.12)] backdrop-blur min-[860px]:hidden">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4">
          <div className="min-w-0 shrink-0">
            <p className="text-xs leading-tight text-muted">{payMode === "part" ? "Pay now (part pay)" : "Pay now (full)"}</p>
            <b className="mt-1 block font-(family-name:--font-display) text-2xl leading-none">{formatINR(quote.payNow)}</b>
          </div>
          <button type="submit" className="btn btn-gold min-h-12 min-w-0 flex-1 text-base" disabled={busy}>
            {busy ? "Please wait..." : "Pay now"}
          </button>
        </div>
      </div>
    </form>

      {error
        ? createPortal(
            <div key={toastKey} className="rv-toast" role="alert" aria-live="assertive">
              <TriangleAlert aria-hidden="true" />
              <p>
                {error} {pendingBooking ? <Link href={`/bookings/${pendingBooking}`}>Open booking</Link> : null}
              </p>
              <button type="button" aria-label="Dismiss" onClick={() => setError("")}>
                <X aria-hidden="true" />
              </button>
            </div>,
            document.body,
          )
        : null}

      {loginOpen
        ? createPortal(
        <div
          className="mmt-dark fixed inset-0 z-[300] grid place-items-center overflow-y-auto bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Log in to continue"
          onKeyDown={(event) => {
            if (event.key === "Escape") setLoginOpen(false);
          }}
        >
          <div className="relative w-full max-w-md">
            <button
              type="button"
              className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
              aria-label="Close login"
              onClick={() => setLoginOpen(false)}
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            <LoginForm
              next={props.loginPath}
              initialEmail={email.trim()}
              onSuccess={() => {
                setAuthed(true);
                setLoginOpen(false);
                void book();
              }}
            />
          </div>
        </div>,
          document.body,
        )
        : null}
    </>
  );
}
