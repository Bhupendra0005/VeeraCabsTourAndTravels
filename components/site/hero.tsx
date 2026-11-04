"use client";

import {
  ArrowRight,
  BusFront,
  CalendarDays,
  CarFront,
  Check,
  CircleCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Send,
  Pause,
  Phone,
  Play,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { openBooking } from "@/components/site/booking";
import { DateField } from "@/components/site/date-field";
import { SelectField } from "@/components/site/select-field";
import { PlaceField, type PlaceOption } from "@/components/site/place-field";
import { areas, destinationCategories, destinations } from "@/lib/content";
import { site, vehicleOptions } from "@/lib/site";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";

const slides: {
  src: string;
  srcSet: string;
  mobileSrcSet?: string;
  alt: string;
  position: string;
}[] = [
  {
    src: "/hero-pune-1600.webp",
    srcSet:
      "/hero-pune-800.webp 800w, /hero-pune-1200.webp 1200w, /hero-pune-1600.webp 1600w",
    mobileSrcSet:
      "/hero-pune-mobile-480.webp 480w, /hero-pune-mobile-720.webp 720w, /hero-pune-mobile-940.webp 940w",
    alt: "Black Veera Tours & Travels SUV in front of a historic fort in Pune at sunset",
    position: "center 50%",
  },
  {
    src: "/hero-palace-1600.webp",
    srcSet:
      "/hero-palace-800.webp 800w, /hero-palace-1200.webp 1200w, /hero-palace-1600.webp 1600w",
    mobileSrcSet:
      "/hero-palace-mobile-480.webp 480w, /hero-palace-mobile-720.webp 720w, /hero-palace-mobile-940.webp 940w",
    alt: "White Veera Tours & Travels SUV in front of a palace at sunset",
    position: "center 50%",
  },
  {
    src: "/hero-lake-1600.webp",
    srcSet:
      "/hero-lake-800.webp 800w, /hero-lake-1200.webp 1200w, /hero-lake-1600.webp 1600w",
    mobileSrcSet:
      "/hero-fort-mobile-480.webp 480w, /hero-fort-mobile-720.webp 720w, /hero-fort-mobile-940.webp 940w",
    alt: "White Veera Tours & Travels SUV beside a lake palace at sunset",
    position: "center 50%",
  },
];

const vehicleIcons = {
  "Spacious MPV": Users,
  "Tempo Traveller": BusFront,
};

const dropOptions: PlaceOption[] = [
  ...destinations.map((place) => ({
    label: place.name,
    hint: destinationCategories.find((c) => c.id === place.category)?.label,
  })),
  ...areas.map((area) => ({ label: area.name, hint: "Pune area" })),
];

const rise = (delay: number) =>
  ({ "--d": `${delay}ms` }) as CSSProperties;

function BookingWidget() {
  const [pickup, setPickup] = useState("Pune, Maharashtra");
  const [drop, setDrop] = useState("");
  const [date, setDate] = useState("");
  const [vehicle, setVehicle] = useState<string>("Any vehicle");
  const [errors, setErrors] = useState<{
    pickup?: boolean;
    drop?: boolean;
    date?: boolean;
  }>({});

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = {
      pickup: !pickup.trim(),
      drop: !drop.trim(),
      date: !date,
    };
    setErrors(next);
    // send the visitor to the first thing that still needs filling in
    const firstMissing = next.pickup
      ? "hero-pickup"
      : next.drop
        ? "hero-drop"
        : next.date
          ? "hero-date"
          : null;
    if (firstMissing) {
      document.getElementById(firstMissing)?.focus();
      return;
    }
    openBooking({
      tripType: "One Way",
      pickup: pickup.trim(),
      drop: drop.trim(),
      date,
      vehicle,
      notes: "Started from the homepage booking bar.",
    });
  };

  return (
    <div className="booking-floating hero-rise" style={rise(540)}>
      <form className="booking-bar" onSubmit={submit}>
        <div className={`booking-field${errors.pickup ? " has-error" : ""}`}>
          <label htmlFor="hero-pickup">Pickup</label>
          <div className="booking-control">
            <MapPin aria-hidden="true" />
            <input
              id="hero-pickup"
              value={pickup}
              onChange={(event) => {
                setPickup(event.target.value);
                setErrors((current) => ({ ...current, pickup: false }));
              }}
              placeholder="Pickup city"
              autoComplete="address-level2"
              aria-invalid={errors.pickup || undefined}
            />
          </div>
        </div>

        <div className={`booking-field${errors.drop ? " has-error" : ""}`}>
          <label htmlFor="hero-drop">Drop</label>
          <div className="booking-control">
            <Send aria-hidden="true" />
            <PlaceField
              id="hero-drop"
              value={drop}
              onChange={(value) => {
                setDrop(value);
                setErrors((current) => ({ ...current, drop: false }));
              }}
              options={dropOptions}
              placeholder="Where are you going?"
              invalid={errors.drop}
            />
          </div>
        </div>

        <div className={`booking-field${errors.date ? " has-error" : ""}`}>
          <label htmlFor="hero-date">Travel date</label>
          <div className="booking-control booking-control-select">
            <CalendarDays aria-hidden="true" />
            <DateField
              id="hero-date"
              value={date}
              onChange={(value) => {
                setDate(value);
                setErrors((current) => ({ ...current, date: false }));
              }}
            />
          </div>
        </div>

        <div className="booking-field">
          <label htmlFor="hero-vehicle">Vehicle</label>
          <div className="booking-control booking-control-select">
            <CarFront aria-hidden="true" />
            <SelectField
              id="hero-vehicle"
              value={vehicle}
              options={vehicleOptions}
              onChange={setVehicle}
              fallbackIcon={CarFront}
              optionIcons={vehicleIcons}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-gold booking-submit">
          Plan my ride
          <ArrowRight aria-hidden="true" />
        </button>
      </form>

      <div className="booking-foot">
        <span>
          <CircleCheck aria-hidden="true" />
          No advance payment
        </span>
        <span>
          <WhatsAppIcon aria-hidden="true" />
          Confirmed on WhatsApp
        </span>
        <span className="booking-foot-extra">
          <Clock3 aria-hidden="true" />
          Local support, 24/7
        </span>
      </div>
    </div>
  );
}

export function Hero() {
  const [active, setActive] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const paused = userPaused || hoverPaused;

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [paused, active]);

  const goTo = (index: number) => {
    setActive((index + slides.length) % slides.length);
  };

  return (
    <section
      className="hero"
      id="home"
      aria-label="Veera Tours & Travels"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onFocus={() => setHoverPaused(true)}
      onBlur={() => setHoverPaused(false)}
    >
      <div className="hero-media">
        {slides.map((slide, index) => (
          <div
            className={`hero-slide${index === active ? " is-active" : ""}${
              slide.mobileSrcSet ? " has-portrait" : ""
            }`}
            key={slide.src}
            aria-hidden={index !== active}
          >
            <picture>
              {slide.mobileSrcSet ? (
                <source
                  media="(max-width: 760px)"
                  srcSet={slide.mobileSrcSet}
                  sizes="100vw"
                />
              ) : null}
              <img
                className="hero-slide-img"
                src={slide.src}
                srcSet={slide.srcSet}
                sizes="100vw"
                width={1600}
                height={900}
                alt={slide.alt}
                loading="eager"
                fetchPriority={index === 0 ? "high" : "low"}
                decoding="async"
                style={{ objectPosition: slide.position }}
                draggable={false}
              />
            </picture>
          </div>
        ))}
        <div className="hero-overlay" />
      </div>

      <div className="shell hero-inner">
        <div className="hero-copy">
          <span className="kicker hero-rise" style={rise(40)}>
            <CarFront aria-hidden="true" />
            Pune’s premier 24/7 cab network
          </span>

          <h1 className="hero-rise" style={rise(120)}>
            Travel India
            <br />
            with
            <br />
            <em>confidence.</em>
          </h1>

          <p className="hero-sub hero-rise" style={rise(220)}>
            From smooth airport transfers to unforgettable hill journeys,
            Veera Tours & Travels keeps every mile comfortable.
          </p>

          <div className="hero-badges hero-rise" style={rise(300)}>
            <span className="hero-badge">
              <ShieldCheck aria-hidden="true" />
              Verified chauffeurs
            </span>
            <span className="hero-badge">
              <Clock3 aria-hidden="true" />
              24/7 availability
            </span>
            <span className="hero-badge">
              <MapPin aria-hidden="true" />
              All India permits
            </span>
          </div>

          <div className="hero-actions hero-rise" style={rise(380)}>
            <button
              type="button"
              className="btn btn-gold hero-book"
              onClick={() => openBooking()}
            >
              Book your ride
              <ArrowRight aria-hidden="true" />
            </button>
            <a className="btn btn-ghost" href={site.primaryPhone.href}>
              <Phone aria-hidden="true" />
              Call 24/7 · {site.primaryPhone.display}
            </a>
          </div>

          <p className="hero-note hero-rise" style={rise(450)}>
            <Check aria-hidden="true" />
            Instant confirmation on WhatsApp. No advance payment required.
          </p>

          <div className="hero-controls hero-rise" style={rise(500)}>
            <div className="hero-dots" role="group" aria-label="Choose a slide">
              {slides.map((slide, index) => (
                <button
                  type="button"
                  key={slide.src}
                  className={`hero-dot${index === active ? " is-active" : ""}`}
                  onClick={() => goTo(index)}
                  aria-label={`Show slide ${index + 1}`}
                  aria-current={index === active ? "true" : undefined}
                />
              ))}
            </div>
            <span className="hero-counter" aria-hidden="true">
              0{active + 1} <i>/</i> 0{slides.length}
            </span>
            <button
              type="button"
              className="hero-pause"
              onClick={() => setUserPaused((current) => !current)}
              aria-label={userPaused ? "Resume slideshow" : "Pause slideshow"}
            >
              {userPaused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
            </button>
            <div className="hero-arrows">
              <button
                type="button"
                className="hero-arrow"
                onClick={() => goTo(active - 1)}
                aria-label="Previous slide"
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <button
                type="button"
                className="hero-arrow"
                onClick={() => goTo(active + 1)}
                aria-label="Next slide"
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <BookingWidget />
      </div>
    </section>
  );
}
