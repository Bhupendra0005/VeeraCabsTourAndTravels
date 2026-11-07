import { assertSameOrigin, handle, json } from "@/lib/server/core/http";
import { destroySession } from "@/lib/server/auth/session";

export const runtime = "nodejs";

export function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    await destroySession();
    return json({ ok: true });
  });
}
