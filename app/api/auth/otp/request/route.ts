import { clientIp, assertSameOrigin, handle, json, readJson } from "@/lib/server/core/http";
import { hashIp, requestOtp } from "@/lib/server/auth/otp";
import { verifyCaptcha } from "@/lib/server/auth/turnstile";
import { email } from "@/lib/server/core/validate";

export const runtime = "nodejs";

export function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const body = await readJson(request);
    const address = email(body.email);
    const ip = clientIp(request);

    // captcha first: it is the cheap gate in front of the email-sending path
    await verifyCaptcha(body.captchaToken, ip);
    await requestOtp(address, hashIp(ip));

    // identical answer for known and unknown addresses
    return json({ ok: true });
  });
}
