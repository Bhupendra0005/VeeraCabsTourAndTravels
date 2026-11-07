"use client";

import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { openBooking, type BookingPrefill } from "@/components/site/booking";
import { useSite } from "@/components/site/site-context";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";

/** Opens the booking modal. Usable from server-rendered pages. */
export function BookButton({
  prefill,
  className = "btn btn-gold",
  children = "Book your ride",
}: {
  prefill?: BookingPrefill;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => openBooking(prefill)}
    >
      {children}
      <ArrowRight aria-hidden="true" />
    </button>
  );
}

export function WhatsAppButton({
  message,
  className = "btn btn-ghost",
  children = "WhatsApp us",
}: {
  message?: string;
  className?: string;
  children?: ReactNode;
}) {
  const { whatsappLink } = useSite();
  return (
    <a
      className={className}
      href={whatsappLink(message)}
      target="_blank"
      rel="noreferrer"
    >
      <WhatsAppIcon aria-hidden="true" />
      {children}
    </a>
  );
}
