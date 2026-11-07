import type { Metadata } from "next";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/login-form";
import { getAdmin } from "@/lib/server/admin/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function AdminLoginPage() {
  if (await getAdmin()) redirect("/admin");

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-ink px-4 py-12 text-(--text)">
      {/* Background: dot grid + soft brand glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] bg-size-[22px_22px] mask-[radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-48 left-1/2 size-[560px] -translate-x-1/2 rounded-full bg-brand/25 blur-[130px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-24 size-[420px] rounded-full bg-[#04567f]/30 blur-[120px]"
      />

      <div className="relative w-full max-w-[440px]">
        {/* Gradient border wrapper */}
        <div className="rounded-3xl bg-linear-to-b from-white/20 via-white/[0.06] to-white/[0.02] p-px shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
          <div className="relative overflow-hidden rounded-[calc(1.5rem-1px)] bg-linear-to-b from-[#0d1416] to-panel px-6 pt-9 pb-7 sm:px-9">
            {/* Top accent line */}
            <div
              aria-hidden="true"
              className="absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-brand-bright to-transparent"
            />

            <div className="mb-8 text-center">
              <img
                src="/logo-navbar-96.webp"
                alt="Veera Tours & Travels"
                width={249}
                height={48}
                className="mx-auto h-11 w-auto drop-shadow-[0_4px_18px_rgba(31,181,247,0.4)] sm:h-12"
                decoding="async"
              />
              <div className="mx-auto my-6 h-px w-16 bg-white/10" />
              <h1 className="font-(family-name:--font-display) text-[26px] leading-tight font-extrabold">Welcome back</h1>
              <p className="mt-1.5 text-sm text-muted">Sign in to the admin panel to manage bookings.</p>
            </div>

            <AdminLoginForm />

            <p className="mt-7 flex items-center justify-center gap-1.5 border-t border-white/5 pt-5 text-xs text-muted">
              <ShieldCheck className="size-3.5 text-brand-bright" aria-hidden="true" />
              Authorised staff only. Sign-in attempts are logged.
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="mx-auto mt-6 flex w-fit items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted transition hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to website
        </Link>
      </div>
    </div>
  );
}
