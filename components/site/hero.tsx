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
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { SearchForm } from "@/components/booking/search-form";
import { openBooking } from "@/components/site/booking";
import type { SearchParams } from "@/lib/booking/search";
import type { SearchOptions } from "@/lib/server/bookings/service";
import { DateField } from "@/components/site/date-field";
import { SelectField } from "@/components/site/select-field";
import { PlaceField, type PlaceOption } from "@/components/site/place-field";
import { useSite } from "@/components/site/site-context";
import { ikUrl } from "@/lib/cms/images";
import type { Home } from "@/lib/server/cms/content";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";

type Slide = {
  src: string;
  srcSet: string;
  mobileSrcSet?: string;
  alt: string;
  position: string;
};

const defaultSlides: Slide[] = [
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

/** Responsive image sets for a hero photo. The built-in files come in fixed sizes; ImageKit photos are resized on the fly. */
function responsiveSets(desktop: string, mobile: string) {
  const builtIn = (url: string, from: RegExp, sizes: number[], build: (base: string, size: number) => string, largest: number) => {
    const match = from.exec(url);
    if (!match) return null;
    return { src: build(match[1], largest), srcSet: sizes.map((size) => `${build(match[1], size)} ${size}w`).join(", ") };
  };
  const wide =
    builtIn(desktop, /^\/(hero-[a-z]+)-1600\.webp$/, [800, 1200, 1600], (base, size) => `/${base}-${size}.webp`, 1600) ?? {
      src: ikUrl(desktop, 1600),
      srcSet: `${ikUrl(desktop, 800)} 800w, ${ikUrl(desktop, 1200)} 1200w, ${ikUrl(desktop, 1600)} 1600w`,
    };
  let tall: string | undefined;
  if (mobile) {
    tall =
      builtIn(mobile, /^\/(hero-[a-z]+(?:-mobile)?)-940\.webp$/, [480, 720, 940], (base, size) => `/${base}-${size}.webp`, 940)?.srcSet ??
      `${ikUrl(mobile, 480)} 480w, ${ikUrl(mobile, 720)} 720w, ${ikUrl(mobile, 940)} 940w`;
  }
  return { desktop: wide, mobile: tall };
}

const vehicleIcons = {
  "Spacious MPV": Users,
  "Tempo Traveller": BusFront,
};

const rise = (delay: number) =>
  ({ "--d": `${delay}ms` }) as CSSProperties;

/** Everything the Book Online search box needs, loaded on the server by the home page. */
export type HomeSearch = {
  options: Pick<SearchOptions, "cities" | "stopCities" | "airports" | "places" | "hourlyCities" | "hourlyPackages">;
  initial: SearchParams;
  tabs: string[];
  maxStops: number;
  oneWayReturn: boolean;
  returnHint: string;
  askTravellers: { airport: boolean; hourly: boolean };
  suggestions: boolean;
  byDistance?: boolean;
};

/** The very same search box as the Book Online page. Searching sends the visitor to the cab list there. */
function HomeSearchBox({ search }: { search: HomeSearch }) {
  return (
    <div className="home-search hero-rise" style={rise(540)}>
      <div className="mmt mmt-band mmt-band--home">
        <SearchForm {...search} landOn="results" />
      </div>
    </div>
  );
}

function BookingWidget({ dropOptions }: { dropOptions: PlaceOption[] }) {
  const { vehicles } = useSite();
  const vehicleOptions = ["Any vehicle", ...vehicles];
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
          Fixed fares, no surprises
        </span>
        <span>
          <WhatsAppIcon aria-hidden="true" />
          E-ticket by email
        </span>
        <span className="booking-foot-extra">
          <Clock3 aria-hidden="true" />
          Local support, 24/7
        </span>
      </div>
    </div>
  );
}

export function Hero({ copy, dropOptions, search }: { copy: Home["hero"]; dropOptions: PlaceOption[]; search: HomeSearch | null }) {
  const { site } = useSite();
  const [active, setActive] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const paused = userPaused || hoverPaused;
  const slides = useMemo(() => {
    const own = copy.slides
      .filter((slide) => slide.desktopImage)
      .map((slide): Slide => {
        const { desktop, mobile } = responsiveSets(slide.desktopImage, slide.mobileImage);
        return { src: desktop.src, srcSet: desktop.srcSet, mobileSrcSet: mobile, alt: slide.alt || site.name, position: "center 50%" };
      });
    return own.length > 0 ? own : defaultSlides;
  }, [copy.slides, site.name]);

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
            {copy.kicker}
          </span>

          <h1 className="hero-rise" style={rise(120)}>
            {copy.line1}
            {copy.line2 ? (
              <>
                <br />
                {copy.line2}
              </>
            ) : null}
            <br />
            <em>{copy.highlight}</em>
          </h1>

          <p className="hero-sub hero-rise" style={rise(220)}>
            {copy.subtitle}
          </p>

          <div className="hero-badges hero-rise" style={rise(300)}>
            {copy.badges.map((badge, index) => {
              const BadgeIcon = [ShieldCheck, Clock3, MapPin][index % 3];
              return (
                <span className="hero-badge" key={badge}>
                  <BadgeIcon aria-hidden="true" />
                  {badge}
                </span>
              );
            })}
          </div>

          <div className="hero-actions hero-rise" style={rise(380)}>
            <button
              type="button"
              className="btn btn-gold hero-book"
              onClick={() => openBooking()}
            >
              {copy.primaryCta}
              <ArrowRight aria-hidden="true" />
            </button>
            <a className="btn btn-ghost" href={site.primaryPhone.href}>
              <Phone aria-hidden="true" />
              Call 24/7 · {site.primaryPhone.display}
            </a>
          </div>

          <p className="hero-note hero-rise" style={rise(450)}>
            <Check aria-hidden="true" />
            {copy.note}
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

        {search ? <HomeSearchBox search={search} /> : <BookingWidget dropOptions={dropOptions} />}
      </div>
    </section>
  );
}
