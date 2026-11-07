import type { Metadata } from "next";
import { ArrowLeft, Route } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { RouteForm } from "@/components/admin/route-form";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { getFleetAll } from "@/lib/server/cms/content";

export const metadata: Metadata = { title: "Add route" };

export default async function NewRoutePage() {
  await requireAdminPage("routes.manage");
  const fleet = await getFleetAll();
  return (
    <div className="grid max-w-5xl gap-6">
      <div className="grid gap-4">
        <Link href="/admin/routes" className="inline-flex w-fit items-center gap-1.5 rounded-lg py-1 pr-2 text-sm text-muted transition hover:text-white">
          <ArrowLeft className="size-4" aria-hidden="true" /> Routes &amp; fares
        </Link>
        <PageHeader icon={<Route />} title="Add route" description="A new fixed-fare route between two cities." />
      </div>
      <RouteForm
        route={{ id: null, fromCity: "", toCity: "", distanceKm: "", durationHours: "", active: true }}
        fares={fleet.map((v) => ({ vehicle: v.title, hidden: !v.active, oneWay: "", roundTrip: "" }))}
      />
    </div>
  );
}
