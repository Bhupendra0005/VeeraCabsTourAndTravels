"use client";

import { ArrowRight, Check } from "lucide-react";
import { useState, type FormEvent } from "react";
import { SelectField } from "@/components/site/select-field";
import { whatsappLink } from "@/lib/site";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";

const topics = [
  "Local car hire in Pune",
  "Outstation trip",
  "Airport pickup / drop",
  "Tour package",
  "Corporate or event travel",
  "Something else",
] as const;

/**
 * Collects a short enquiry and hands it over to WhatsApp, the same channel the
 * booking modal uses, so the team replies from one inbox.
 */
export function ContactForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [topic, setTopic] = useState<string>(topics[0]);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const lines = [
      "Hi Veera Tours & Travels, I have an enquiry.",
      "",
      `Name: ${name.trim()}`,
      `Phone: ${phone.trim()}`,
      `Looking for: ${topic}`,
    ];
    if (message.trim()) lines.push("", message.trim());
    window.open(whatsappLink(lines.join("\n")), "_blank", "noopener,noreferrer");
    setSent(true);
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
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+91 98765 43210"
            autoComplete="tel"
            pattern="[0-9+\s\-]{10,16}"
            title="Enter a valid phone number"
            required
          />
        </div>

        <div className="cf-field cf-wide">
          <label htmlFor="cf-topic">I am looking for</label>
          <SelectField
            id="cf-topic"
            value={topic}
            options={topics}
            onChange={setTopic}
            tone="dark"
          />
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
          />
        </div>
      </div>

      <button type="submit" className="btn btn-gold cf-submit">
        <WhatsAppIcon aria-hidden="true" />
        Send on WhatsApp
        <ArrowRight aria-hidden="true" />
      </button>

      <p className="cf-note" role="status">
        <Check aria-hidden="true" />
        {sent
          ? "WhatsApp opened with your message. Just press send."
          : "Opens WhatsApp with your details filled in. No advance payment."}
      </p>
    </form>
  );
}
