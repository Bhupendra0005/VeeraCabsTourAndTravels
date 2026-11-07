import { adminPdf } from "@/lib/server/admin/pdf";

export const runtime = "nodejs";

export function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  return adminPdf("invoice", ctx.params);
}
