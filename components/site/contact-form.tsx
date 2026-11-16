"use client";

import { ArrowRight, Check } from "lucide-react";
import { useCallback, useState, type FormEvent } from "react";
import { Turnstile } from "@/components/auth/turnstile";
import { SelectField } from "@/components/site/select-field";
import { useSite } from "@/components/site/site-context";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { cleanMobile } from "@/lib/utils/phone";

export const CONTACT_TOPICS = [
  "Local car hire in Pune",
  "Outstation trip",
  "Airport pickup / drop",
  "Tour package",
  "Corporate or event travel",
  "Something else",
] as const;

const CAPTCHA_REQUIRED = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** Digits only, without a +91 / 91 / 0 prefix: the same shape the server checks. */
function normalisePhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length > 10 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

type Outcome = { kind: "idle" } | { kind: "saved" } | { kind: "whatsapp-only"; reason: string };

/**
 * Saves the enquiry (so it shows up in Admin > Enquiries) and also opens WhatsApp with the details,
 * so the team can reply from either place. If saving fails the WhatsApp message still goes out.
 */
export function ContactForm({ initialTopic, initialMessage }: { initialTopic?: string; initialMessage?: string }) {
  const { whatsappLink } = useSite();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [topic, setTopic] = useState<string>(initialTopic && (CONTACT_TOPICS as readonly string[]).includes(initialTopic) ? initialTopic : CONTACT_TOPICS[0]);
  const [message, setMessage] = useState(initialMessage ?? "");
  const [honeypot, setHoneypot] = useState("");
  const [token, setToken] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });
  const onToken = useCallback((value: string) => setToken(value), []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const mobile = normalisePhone(phone);
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setPhoneError("Enter a valid 10-digit mobile number.");
      return;
    }
    setPhoneError("");
    if (CAPTCHA_REQUIRED && !token) {
      setOutcome({ kind: "whatsapp-only", reason: "Please complete the captcha first." });
      return;
    }
    setBusy(true);

    // open WhatsApp straight from the click (browsers block pop-ups opened after a wait)
    const lines = [
      "Hi Veera Tours & Travels, I have an enquiry.",
      "",
      `Name: ${name.trim()}`,
      `Phone: ${mobile}`,
      `Looking for: ${topic}`,
    ];
    if (message.trim()) lines.push("", message.trim());
    window.open(whatsappLink(lines.join("\n")), "_blank", "noopener,noreferrer");

    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: mobile, topic, message: message.trim(), website: honeypot, captchaToken: token }),
      });
      if (res.ok) {
        setOutcome({ kind: "saved" });
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setOutcome({ kind: "whatsapp-only", reason: data.error ?? "We could not save it here." });
      }
    } catch {
      setOutcome({ kind: "whatsapp-only", reason: "We could not save it here." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="cf-form" onSubmit={submit}>
      <div className="cf-grid">
        <div className="cf-field">
          <label htmlFor="cf-name">Your name</label>
          <input
            id="cf-name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Rahul Patil"
            autoComplete="name"
            maxLength={80}
            required
          />
        </div>

        <div className="cf-field">
          <label htmlFor="cf-phone">Phone number</label>
          <input
            id="cf-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(event) => {
              // digits only, at most 10; a pasted "+91 98765 43210" is trimmed to the 10-digit number
              setPhone(cleanMobile(event.target.value));
              if (phoneError) setPhoneError("");
            }}
            onBlur={() => {
              if (phone && !/^[6-9]\d{9}$/.test(phone)) setPhoneError("Enter a valid 10-digit mobile number.");
            }}
            placeholder="98765 43210"
            autoComplete="tel-national"
            pattern="[6-9][0-9]{9}"
            title="Enter a 10-digit mobile number starting with 6, 7, 8 or 9."
            aria-invalid={phoneError ? true : undefined}
            aria-describedby={phoneError ? "cf-phone-error" : undefined}
            required
          />
          {phoneError ? (
            <small id="cf-phone-error" role="alert" className="field-error">
              {phoneError}
            </small>
          ) : null}
        </div>

        <div className="cf-field cf-wide">
          <label htmlFor="cf-topic">I am looking for</label>
          <SelectField id="cf-topic" value={topic} options={CONTACT_TOPICS} onChange={setTopic} tone="dark" />
        </div>

        <div className="cf-field cf-wide">
          <label htmlFor="cf-message">Trip details</label>
          <textarea
            id="cf-message"
            name="message"
            rows={4}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Pickup, drop, travel date and number of passengers"
            maxLength={1000}
          />
        </div>

        {/* honeypot: hidden from people, bots fill it in */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
          <label htmlFor="cf-website">Leave this empty</label>
          <input id="cf-website" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} />
        </div>
      </div>

      <Turnstile onToken={onToken} />

      <button type="submit" className="btn btn-gold cf-submit" disabled={busy}>
        <WhatsAppIcon aria-hidden="true" />
        {busy ? "Sending…" : "Send enquiry"}
        <ArrowRight aria-hidden="true" />
      </button>

      <p className="cf-note" role="status">
        <Check aria-hidden="true" />
        {outcome.kind === "saved"
          ? "Thanks! Our team has your enquiry and WhatsApp opened with your message. Just press send there too."
          : outcome.kind === "whatsapp-only"
            ? `${outcome.reason} WhatsApp opened with your message, please press send there.`
            : "We save your enquiry and open WhatsApp with your details. For fixed-fare cabs, use Book Online."}
      </p>
    </form>
  );
}
