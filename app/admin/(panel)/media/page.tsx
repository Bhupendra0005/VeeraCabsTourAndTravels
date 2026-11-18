import type { Metadata } from "next";
import { Images } from "lucide-react";
import { Alert, PageHeader } from "@/components/admin/ui";
import { MediaLibrary } from "@/components/admin/media-library";
import { requireAdminPage } from "@/lib/server/admin/guard";

export const metadata: Metadata = { title: "Media library" };

export default async function AdminMediaPage() {
  await requireAdminPage("media.manage");
  const configured = !!process.env.IMAGEKIT_PRIVATE_KEY && !!process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader
        icon={<Images />}
        title="Media library"
        description="Upload photos once, then choose them anywhere on the website (hero, fleet, destinations). Images are stored on ImageKit."
      />
      {!configured ? <Alert tone="warning">ImageKit is not configured on the server yet, so uploads are unavailable.</Alert> : null}
      <section className="rounded-2xl border border-brand-bright/25 bg-linear-to-b from-[#0c1a24] to-panel p-4 shadow-[0_0_44px_-20px_rgba(0,150,219,0.5)] sm:p-6">
        <MediaLibrary mode="manage" />
      </section>
    </div>
  );
}
