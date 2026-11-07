import type { Metadata } from "next";
import { CalendarDays, KeyRound, ShieldCheck, Ticket, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { AccountBanner } from "@/components/account/account-banner";
import { accountGroups } from "@/components/account/nav";
import { ProfileForm } from "@/components/account/profile-form";
import { getProfile } from "@/lib/server/auth/profile";
import { getSession } from "@/lib/server/auth/session";
import { listCustomerBookings } from "@/lib/server/bookings/service";

export const metadata: Metadata = {
  title: "My profile",
  robots: { index: false, follow: false },
};

function memberSince(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
}

/** Round progress indicator with the percentage in the middle. */
function ProgressRing({ percent }: { percent: number }) {
  return (
    <span className="relative grid size-14 shrink-0 place-items-center" role="img" aria-label={`${percent}% complete`}>
      <svg viewBox="0 0 36 36" className="absolute inset-0 size-full -rotate-90">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" pathLength={100} strokeDasharray={`${percent} ${100 - percent}`} style={{ filter: "drop-shadow(0 0 3px rgba(34,211,238,0.7))" }} />
      </svg>
      <span className="text-[13px] font-extrabold">{percent}%</span>
    </span>
  );
}

/** An envelope with a masked code, for "no password, we email you a code". */
function EnvelopeArt() {
  return (
    <svg viewBox="0 0 120 100" className="h-24 w-auto shrink-0 drop-shadow-[0_8px_24px_rgba(34,211,238,0.4)]" aria-hidden="true">
      <g stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" opacity=".9">
        <path d="M14 30 L22 36" />
        <path d="M60 6 V16" />
        <path d="M106 30 L98 36" />
      </g>
      <rect x="26" y="34" width="68" height="40" rx="7" fill="#0c3250" stroke="#22d3ee" strokeWidth="3" />
      <path d="M28 38 L60 60 L92 38" fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinejoin="round" />
      <rect x="18" y="68" width="84" height="22" rx="8" fill="#0a2236" stroke="#22d3ee" strokeWidth="2.5" />
      {[0, 1, 2, 3, 4].map((i) => (
        <text key={i} x={32 + i * 14} y="86" fontSize="16" fontWeight="700" fill="#e8f9ff" textAnchor="middle">
          *
        </text>
      ))}
    </svg>
  );
}

/** A shield with a padlock, for "your data". */
function ShieldArt() {
  return (
    <svg viewBox="0 0 100 110" className="h-28 w-auto shrink-0 drop-shadow-[0_8px_24px_rgba(34,211,238,0.35)]" aria-hidden="true">
      <defs>
        <linearGradient id="pf-shield" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38d3ee" />
          <stop offset="1" stopColor="#0a6fb0" />
        </linearGradient>
      </defs>
      <path d="M50 6 L90 20 V52 C90 78 72 96 50 104 C28 96 10 78 10 52 V20 Z" fill="url(#pf-shield)" stroke="#bff3ff" strokeWidth="3" strokeLinejoin="round" />
      <path d="M50 14 L82 25 V52 C82 73 68 88 50 96 Z" fill="#ffffff" opacity=".12" />
      <rect x="32" y="50" width="36" height="28" rx="6" fill="#0a2d4a" />
      <path d="M39 50 V43 A11 11 0 0 1 61 43 V50" fill="none" stroke="#0a2d4a" strokeWidth="6" strokeLinecap="round" />
      <circle cx="50" cy="63" r="4" fill="#bff3ff" />
      <rect x="48.4" y="63" width="3.2" height="9" rx="1.6" fill="#bff3ff" />
    </svg>
  );
}

const card = "rounded-3xl border border-brand-bright/25 bg-linear-to-b from-[#0c1a24]/90 to-panel shadow-[0_0_44px_-22px_rgba(0,150,219,0.6)]";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/profile");

  const [profile, bookings] = await Promise.all([
    getProfile(session.customerId, session.email),
    listCustomerBookings(session.customerId).catch(() => null),
  ]);

  const display = profile.name || session.email.split("@")[0];
  const initial = display.trim().charAt(0).toUpperCase();
  const checks = [profile.name, profile.phone, profile.city];
  const done = checks.filter(Boolean).length;
  const percent = Math.round(((done + 1) / (checks.length + 1)) * 100); // email is always set
  const since = memberSince(profile.createdAt);

  return (
    <AccountShell
      groups={accountGroups({ current: "profile" })}
      email={session.email}
      banner={
        <AccountBanner
          eyebrow="My profile"
          title={
            <>
              Hi, {display} <span aria-hidden="true">👋</span>
            </>
          }
          subtitle={session.email}
          initial={initial}
          stats={[
            { icon: <Ticket />, value: bookings ? bookings.length : "-", label: "Total bookings" },
            { icon: <CalendarDays />, value: since || "—", label: "Member since" },
            { icon: <UserRound />, value: `${percent}%`, label: "Profile complete", progress: percent },
          ]}
        />
      }
    >
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className={`${card} p-5 sm:p-7`}>
          <div className="mb-6 flex flex-wrap items-center gap-4 border-b border-white/10 pb-5">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-brand/25 to-brand/5 text-brand-bright ring-1 ring-brand-bright/25">
              <UserRound className="size-7" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 basis-56">
              <h2 className="font-(family-name:--font-display) text-2xl font-extrabold">Personal Details</h2>
              <p className="text-sm text-muted">Keep these up to date so booking is quicker.</p>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/25 py-1.5 pl-1.5 pr-5">
              <ProgressRing percent={percent} />
              <span className="text-sm font-semibold">Profile complete</span>
            </div>
          </div>
          <ProfileForm initial={{ email: profile.email, name: profile.name, phone: profile.phone, city: profile.city }} />
        </section>

        <aside className="grid gap-5">
          <div className={`${card} flex items-center gap-3 p-6`}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand-bright ring-1 ring-brand-bright/25">
                  <KeyRound className="size-5" aria-hidden="true" />
                </span>
                <h2 className="font-(family-name:--font-display) text-lg font-extrabold">How you sign in?</h2>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-white/75">
                There is no password to remember or leak. Each time you log in we email a fresh 6-digit code to{" "}
                <b className="text-white wrap-anywhere">{session.email}</b>.
              </p>
            </div>
            <EnvelopeArt />
          </div>

          <div className={`${card} flex items-center gap-3 p-6`}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand-bright ring-1 ring-brand-bright/25">
                  <ShieldCheck className="size-5" aria-hidden="true" />
                </span>
                <h2 className="font-(family-name:--font-display) text-lg font-extrabold">Your Data</h2>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-white/75">We only use your name and mobile number to manage your bookings and contact you about your trips.</p>
            </div>
            <ShieldArt />
          </div>
        </aside>
      </div>
    </AccountShell>
  );
}
