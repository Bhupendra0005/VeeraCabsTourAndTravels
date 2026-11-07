import { assertSameOrigin, handle, HttpError, json, readJson } from "@/lib/server/core/http";
import { verifyOtp } from "@/lib/server/auth/otp";
import { fillProfileIfBlank } from "@/lib/server/auth/profile";
import { createSession } from "@/lib/server/auth/session";
import { email, phone, str } from "@/lib/server/core/validate";

export const runtime = "nodejs";

export function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const body = await readJson(request);
    const address = email(body.email);
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!/^\d{6}$/.test(code)) throw new HttpError(400, "Enter the 6-digit code.");

    // Sign-up details are validated before the code is used up, so a typo does not burn the code.
    let signup: { name: string; phone: string } | null = null;
    if (body.profile && typeof body.profile === "object") {
      const p = body.profile as Record<string, unknown>;
      signup = { name: str(p, "name", 2, 80), phone: phone(p.phone) };
    }

    const customer = await verifyOtp(address, code);
    if (signup) {
      // never blocks the login itself
      await fillProfileIfBlank(customer.id, signup).catch((error) => console.error("Could not save profile", error));
    }
    await createSession({ customerId: customer.id, email: customer.email });
    return json({ ok: true });
  });
}
