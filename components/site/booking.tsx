"use client";

import {
  CalendarDays,
  CarFront,
  Clock3,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { DateField } from "@/components/site/date-field";
import { SelectField } from "@/components/site/select-field";
import { TimeField } from "@/components/site/time-field";
import { useSite } from "@/components/site/site-context";
import { passengerOptions, tripTypes, type TripType } from "@/lib/site";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";

const BOOK_EVENT = "veera:open-booking";

export type BookingPrefill = {
  tripType?: TripType;
  pickup?: string;
  drop?: string;
  date?: string;
  time?: string;
  passengers?: string;
  vehicle?: string;
  name?: string;
  phone?: string;
  notes?: string;
};

type FormState = {
  tripType: TripType;
  pickup: string;
  drop: string;
  date: string;
  time: string;
  passengers: string;
  vehicle: string;
  name: string;
  phone: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  tripType: "One Way",
  pickup: "Pune, Maharashtra",
  drop: "",
  date: "",
  time: "",
  passengers: "2 passengers",
  vehicle: "Any vehicle",
  name: "",
  phone: "",
  notes: "",
};

/** Keeps only the digits and drops a +91 / 91 / 0 prefix. */
function normalisePhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length > 10 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

export function openBooking(prefill: BookingPrefill = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<BookingPrefill>(BOOK_EVENT, { detail: prefill }),
  );
}

export function BookingModal() {
  const { site, whatsappLink, vehicles } = useSite();
  const vehicleOptions = ["Any vehicle", ...vehicles];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [dateMissing, setDateMissing] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [successLink, setSuccessLink] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<BookingPrefill>).detail ?? {};
      setForm({ ...EMPTY_FORM, ...detail });
      setSubmitted(false);
      setSuccessLink("");
      setDateMissing(false);
      setPhoneError("");
      setOpen(true);
    };
    window.addEventListener(BOOK_EVENT, handler);
    return () => window.removeEventListener(BOOK_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => firstFieldRef.current?.focus(), 90);

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  const update =
    (key: keyof FormState) =>
    (
      event: ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const value = event.target.value;
      setForm((current) => ({ ...current, [key]: value }));
    };

  const close = () => setOpen(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // the custom date picker is a button, so check the date ourselves
    // Indian mobile number: exactly 10 digits, starting with 6-9 (a +91 or 0 prefix is fine)
    const digits = normalisePhone(form.phone);
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setPhoneError("Enter a valid 10-digit mobile number.");
      document.getElementById("booking-phone")?.focus();
      return;
    }
    if (!form.date) {
      setDateMissing(true);
      document.getElementById("booking-date")?.focus();
      return;
    }
    const lines = [
      "Hi Veera Tours & Travels, I would like to book a cab.",
      "",
      `Trip type: ${form.tripType}`,
      `Pickup: ${form.pickup}`,
      `Drop / destination: ${form.drop}`,
      `Travel date: ${form.date}`,
      `Passengers: ${form.passengers}`,
      `Vehicle preference: ${form.vehicle}`,
      `Name: ${form.name}`,
      `Phone: +91 ${normalisePhone(form.phone)}`,
    ];
    if (form.time) lines.splice(6, 0, `Pickup time: ${form.time}`);
    if (form.notes.trim()) lines.push(`Notes: ${form.notes.trim()}`);
    lines.push("", "Please share availability and the best fare. Thank you.");
    const message = lines.join("\n");

    const link = whatsappLink(message);
    window.open(link, "_blank", "noopener,noreferrer");
    setSuccessLink(link);
    setSubmitted(true);
  };

  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !panelRef.current) return;
    const focusable = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.offsetParent !== null);

    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!open) return null;

  return (
    <div
      className="booking-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
        aria-describedby="booking-description"
        ref={panelRef}
        onKeyDown={trapFocus}
      >
        <div className="modal-checker" aria-hidden="true" />
        <button
          type="button"
          className="modal-close"
          onClick={close}
          aria-label="Close booking form"
        >
          <X />
        </button>

        {!submitted ? (
          <>
            <div className="modal-head">
              <span className="kicker">
                <CarFront aria-hidden="true" />
                Reserve your ride
              </span>
              <h2 id="booking-title">Tell us where you’re headed.</h2>
              <p id="booking-description">
                Share a few details and we’ll confirm availability, your
                chauffeur and the best fare on WhatsApp — usually within
                minutes.
              </p>
            </div>

            <form className="booking-form modal-body" onSubmit={handleSubmit}>
              <div className="trip-tabs" role="group" aria-label="Trip type">
                {tripTypes.map((type) => (
                  <button
                    type="button"
                    key={type}
                    className={`trip-tab${form.tripType === type ? " is-active" : ""}`}
                    aria-pressed={form.tripType === type}
                    onClick={() => setForm((current) => ({ ...current, tripType: type }))}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="form-grid">
                <div className="field">
                  <label htmlFor="booking-pickup">Pickup</label>
                  <div className="field-control">
                    <MapPin aria-hidden="true" />
                    <input
                      ref={firstFieldRef}
                      id="booking-pickup"
                      name="pickup"
                      value={form.pickup}
                      onChange={update("pickup")}
                      placeholder="Pickup city or address"
                      autoComplete="address-level2"
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="booking-drop">Drop / destination</label>
                  <div className="field-control">
                    <Navigation aria-hidden="true" />
                    <input
                      id="booking-drop"
                      name="drop"
                      value={form.drop}
                      onChange={update("drop")}
                      placeholder="Where would you like to go?"
                      autoComplete="address-level2"
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="booking-date">Travel date</label>
                  <div className="field-control">
                    <CalendarDays aria-hidden="true" />
                    <DateField
                      id="booking-date"
                      value={form.date}
                      onChange={(value) => {
                        setForm((current) => ({ ...current, date: value }));
                        if (value) setDateMissing(false);
                      }}
                    />
                  </div>
                  {dateMissing ? (
                    <span className="field-error" role="alert">
                      Please choose your travel date.
                    </span>
                  ) : null}
                </div>

                <div className="field">
                  <label htmlFor="booking-time">Pickup time</label>
                  <div className="field-control">
                    <Clock3 aria-hidden="true" />
                    <TimeField
                      id="booking-time"
                      value={form.time}
                      onChange={(value) =>
                        setForm((current) => ({ ...current, time: value }))
                      }
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="booking-passengers">Passengers</label>
                  <div className="field-control">
                    <Users aria-hidden="true" />
                    <SelectField
                      id="booking-passengers"
                      value={form.passengers}
                      options={passengerOptions}
                      onChange={(value) =>
                        setForm((current) => ({ ...current, passengers: value }))
                      }
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="booking-vehicle">Vehicle</label>
                  <div className="field-control">
                    <CarFront aria-hidden="true" />
                    <SelectField
                      id="booking-vehicle"
                      value={form.vehicle}
                      options={vehicleOptions}
                      onChange={(value) =>
                        setForm((current) => ({ ...current, vehicle: value }))
                      }
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="booking-name">Your name</label>
                  <div className="field-control">
                    <User aria-hidden="true" />
                    <input
                      id="booking-name"
                      name="name"
                      value={form.name}
                      onChange={update("name")}
                      placeholder="Full name"
                      autoComplete="name"
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="booking-phone">Phone number</label>
                  <div className="field-control">
                    <Phone aria-hidden="true" />
                    <input
                      id="booking-phone"
                      name="phone"
                      type="tel"
                      inputMode="numeric"
                      value={form.phone}
                      onChange={(event) => {
                        // digits only, at most 10
                        const value = event.target.value.replace(/\D/g, "").slice(0, 10);
                        setForm((current) => ({ ...current, phone: value }));
                        if (phoneError) setPhoneError("");
                      }}
                      placeholder="10-digit mobile number"
                      autoComplete="tel-national"
                      maxLength={10}
                      aria-invalid={phoneError ? true : undefined}
                      aria-describedby={phoneError ? "booking-phone-error" : undefined}
                      required
                    />
                  </div>
                  {phoneError ? (
                    <span className="field-error" id="booking-phone-error" role="alert">
                      {phoneError}
                    </span>
                  ) : null}
                </div>

                <div className="field field-full">
                  <label htmlFor="booking-notes">Anything we should know?</label>
                  <textarea
                    id="booking-notes"
                    name="notes"
                    value={form.notes}
                    onChange={update("notes")}
                    placeholder="Flight number, luggage, child seat or a special request (optional)"
                    rows={2}
                  />
                </div>
              </div>

              <div className="booking-submit-row">
                <button type="submit" className="btn btn-gold">
                  <WhatsAppIcon aria-hidden="true" />
                  Send request on WhatsApp
                </button>
                <a className="btn btn-ghost" href={site.primaryPhone.href}>
                  <Phone aria-hidden="true" />
                  Call instead
                </a>
                <span className="booking-note">
                  <ShieldCheck aria-hidden="true" />
                  No payment online. Booked only after our WhatsApp confirmation.
                </span>
              </div>
            </form>
          </>
        ) : (
          <div className="booking-success modal-body" role="status">
            <div className="success-icon is-pending">
              <Clock3 aria-hidden="true" />
            </div>
            <span className="kicker">Not booked yet</span>
            <h2>Send the message on WhatsApp.</h2>
            <p>
              We have opened WhatsApp with your trip details. Press send there.
              Your ride is booked only after our team replies and confirms it
              on WhatsApp.
            </p>
            <p className="success-note">
              If WhatsApp did not open, use the button below.
            </p>
            <a
              className="btn btn-gold"
              href={successLink}
              target="_blank"
              rel="noreferrer"
            >
              <WhatsAppIcon aria-hidden="true" />
              Open WhatsApp
            </a>
            <a className="success-phone" href={site.primaryPhone.href}>
              <Phone aria-hidden="true" />
              Or call {site.primaryPhone.display}
            </a>
            <button
              type="button"
              className="success-reset"
              onClick={() => setSubmitted(false)}
            >
              Make another enquiry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
