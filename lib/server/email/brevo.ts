import "server-only";
import { isProd } from "@/lib/server/core/env";

export type Attachment = { name: string; content: Uint8Array };

/** Escapes user-supplied text before it goes into an HTML email. */
export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * Sends a transactional email through Brevo. Without BREVO_API_KEY it only logs in
 * development and throws in production (so OTPs never leak into production logs).
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Attachment[];
}) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!apiKey || !senderEmail) {
    if (isProd) throw new Error("Brevo is not configured");
    console.log(`[dev email] to=${opts.to} subject="${opts.subject}"\n${opts.text}`);
    return;
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: senderEmail, name: process.env.BREVO_SENDER_NAME || "Veera Tours & Travels" },
      to: [{ email: opts.to }],
      subject: opts.subject,
      htmlContent: opts.html,
      textContent: opts.text,
      attachment: opts.attachments?.map((a) => ({
        name: a.name,
        content: Buffer.from(a.content).toString("base64"),
      })),
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    console.error("Brevo send failed", res.status);
    throw new Error("Email provider rejected the message");
  }
}
