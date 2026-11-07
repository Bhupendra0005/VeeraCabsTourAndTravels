import { assertSameOrigin, handle, json, readJson } from "@/lib/server/core/http";
import { requireSession } from "@/lib/server/auth/guard";
import { parseProfile, updateProfile } from "@/lib/server/auth/profile";

export const runtime = "nodejs";

export function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const session = await requireSession();
    const input = parseProfile(await readJson(request));
    await updateProfile(session.customerId, input);
    return json({ ok: true });
  });
}
