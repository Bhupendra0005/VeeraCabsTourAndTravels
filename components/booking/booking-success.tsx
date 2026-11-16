"use client";

import { ArrowRight, CalendarDays, CarFront, Check, Copy, Download, Mail, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { postJson } from "@/lib/payments/checkout-client";

type Props = {
  bookingId: string;
  bookingRef: string;
  email: string;
  from: string;
  /** Empty for trips with a single place (hourly rentals). */
  to: string;
  date: string;
  time: string;
  cab: string;
  cabNote: string;
  paid: string;
  total: string;
  balance: string | null;
  /** Share of the total already paid, 0-100. */
  percent: number;
};

/** Confetti pieces: x offset, delay, spin, colour. Fixed values so the screen looks the same every time. */
const CONFETTI = [
  [8, 0.0, 200, "#ffd23f"],
  [18, 0.15, -160, "#3ddc97"],
  [27, 0.05, 240, "#4cc9f0"],
  [36, 0.3, -200, "#ff6b8b"],
  [45, 0.1, 180, "#ffd23f"],
  [54, 0.25, -240, "#a78bfa"],
  [63, 0.02, 220, "#3ddc97"],
  [72, 0.2, -180, "#4cc9f0"],
  [81, 0.12, 260, "#ff6b8b"],
  [90, 0.28, -220, "#ffd23f"],
  [13, 0.4, 170, "#a78bfa"],
  [49, 0.45, -190, "#ff9f43"],
  [77, 0.38, 210, "#3ddc97"],
  [95, 0.5, -170, "#4cc9f0"],
] as const;

/** Full-screen "Booking Confirmed" shown right after a successful payment, like the MakeMyTrip app. */
export function BookingSuccess({ bookingId, bookingRef, email, from, to, date, time, cab, cabNote, paid, total, balance, percent }: Props) {
  const [open, setOpen] = useState(true);
  // false while rendering on the server, true in the browser (the portal needs document.body)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [mail, setMail] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [mailError, setMailError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || !mounted) return null;

  const resend = async () => {
    setMail("sending");
    setMailError("");
    try {
      await postJson(`/api/bookings/${bookingId}/email`);
      setMail("sent");
    } catch (e) {
      setMail("error");
      setMailError((e as Error).message);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(bookingRef);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard can be blocked: the ID is on screen to read out anyway */
    }
  };

  return createPortal(
    <div
      className="bk-success"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bk-success-title"
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <div className="bk-success-card">
        <button type="button" className="bk-success-close" aria-label="Close" onClick={() => setOpen(false)}>
          <X aria-hidden="true" />
        </button>

        <div className="bk-success-top">
          <div className="bk-confetti" aria-hidden="true">
            {CONFETTI.map(([x, delay, spin, colour], index) => (
              <i key={index} style={{ left: `${x}%`, animationDelay: `${delay}s`, background: colour, ["--spin" as string]: `${spin}deg` }} />
            ))}
          </div>
          <span className="bk-success-check" aria-hidden="true">
            <svg viewBox="0 0 52 52">
              <path d="M14 27 l8 8 l16 -18" />
            </svg>
          </span>
          <h2 id="bk-success-title">Booking Confirmed!</h2>
          <p>Get ready for your ride. We have saved your seat.</p>
        </div>

        <div className="bk-success-body">
          <div className="bk-success-scroll">
          <div className="bk-ticket">
            <div className="bk-ticket-id">
              <span>
                <small>Booking ID</small>
                <b>{bookingRef}</b>
              </span>
              <button type="button" onClick={copy} aria-label="Copy booking ID">
                {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="bk-ticket-route">
              <span>
                <small>From</small>
                <b>{from}</b>
              </span>
              {to ? (
                <>
                  <i aria-hidden="true">
                    <CarFront />
                  </i>
                  <span className="is-end">
                    <small>To</small>
                    <b>{to}</b>
                  </span>
                </>
              ) : null}
            </div>

            <ul className="bk-ticket-tiles">
              <li>
                <CalendarDays aria-hidden="true" />
                <span>
                  <small>Pickup date</small>
                  <b>{date}</b>
                </span>
              </li>
              <li>
                <CalendarDays aria-hidden="true" />
                <span>
                  <small>Pickup time</small>
                  <b>{time}</b>
                </span>
              </li>
              <li className="is-wide">
                <CarFront aria-hidden="true" />
                <span>
                  <small>Cab</small>
                  <b>{cab}</b>
                  {cabNote ? <em>{cabNote}</em> : null}
                </span>
              </li>
            </ul>

            <div className="bk-ticket-cut" aria-hidden="true" />

            <div className="bk-ticket-pay">
              <div>
                <span>
                  Paid <b>{paid}</b>
                </span>
                {balance ? (
                  <span className="is-due">
                    Balance <b>{balance}</b>
                  </span>
                ) : (
                  <span className="is-ok">Fully paid</span>
                )}
              </div>
              <div className="bk-ticket-bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Amount paid">
                <span style={{ width: `${percent}%` }} />
              </div>
              <small>Total fare {total}</small>
            </div>
          </div>

          <div className="bk-success-mail" role="status">
            <Mail aria-hidden="true" />
            <p>
              E-ticket and invoice sent to <b>{email}</b>.{" "}
              {mail === "sent" ? (
                <span className="is-ok">Sent again!</span>
              ) : (
                <button type="button" onClick={resend} disabled={mail === "sending"}>
                  {mail === "sending" ? "Sending..." : "Didn't get it? Send again"}
                </button>
              )}
            </p>
          </div>
          {mail === "error" ? (
            <p className="bk-success-error" role="alert">
              {mailError}
            </p>
          ) : null}

          <p className="bk-success-note">Your driver and cab details will be shared with you before pickup.</p>

          </div>

          <div className="bk-success-actions">
            <a className="bk-btn-primary" href={`/api/bookings/${bookingId}/ticket`}>
              <Download aria-hidden="true" /> Download e-ticket
            </a>
            <button type="button" className="bk-btn-secondary" onClick={() => setOpen(false)}>
              View booking details <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
