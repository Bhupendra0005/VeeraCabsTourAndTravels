import { createEnquiry, ENQUIRY_TOPICS } from "@/lib/server/enquiries";
import { hashIp } from "@/lib/server/auth/otp";
import { verifyCaptcha } from "@/lib/server/auth/turnstile";
import { assertSameOrigin, clientIp, handle, json, readJson } from "@/lib/server/core/http";
import { optStr, phone, str } from "@/lib/server/core/validate";

export const runtime = "nodejs";

/**
 * Public by design (a visitor has no account yet), so it is locked down instead: same-origin only,
 * captcha when configured, a hidden honeypot field, strict lengths, and per-IP / per-phone limits.
 * Nothing is trusted from the browser: the topic must be one of ours and the source is fixed here.
 */
export function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const body = await readJson(request);

    // bots fill every field; a real visitor never sees this one. Pretend it worked.
    if (typeof body.website === "string" && body.website.trim() !== "") return json({ ok: true });

    const ip = clientIp(request);
    await verifyCaptcha(body.captchaToken, ip);

    const name = str(body, "name", 1, 80);
    const mobile = phone(body.phone);
    const requested = optStr(body, "topic", 60);
    const topic = (ENQUIRY_TOPICS as readonly string[]).includes(requested) ? requested : "Something else";
    const message = optStr(body, "message", 1000);

    await createEnquiry({ name, phone: mobile, topic, message, source: "contact_form" }, hashIp(ip));
    return json({ ok: true }, 201);
  });
}
