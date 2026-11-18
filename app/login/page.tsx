import type { Metadata } from "next";
import { CalendarCheck, KeyRound, ShieldCheck, Ticket } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { PageShell } from "@/components/site/page-shell";
import { getSession } from "@/lib/server/auth/session";
import { safeNextPath } from "@/lib/server/core/validate";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: false },
};

const benefits = [
  {
    icon: KeyRound,
    title: "No password to remember",
    text: "We email you a fresh 6-digit code each time you sign in.",
    shortText: "We email you a fresh 6-digit code each time.",
  },
  {
    icon: Ticket,
    title: "Tickets and invoices in one place",
    shortTitle: "Tickets & invoices in one place",
    text: "Download your e-ticket and invoice whenever you need them.",
    shortText: "Download your e-ticket and invoice anytime.",
  },
  {
    icon: CalendarCheck,
    title: "Manage every trip",
    text: "Pay the balance, check details or cancel from your bookings.",
    shortText: "Pay the balance, check details or cancel bookings.",
  },
  {
    icon: ShieldCheck,
    title: "Safe and secure",
    text: "Protected by captcha and payments handled by Razorpay.",
    shortText: "Protected by captcha and payments handled by Razorpay.",
  },
] as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.next;
  const next = safeNextPath(Array.isArray(raw) ? raw[0] : raw);
  const mode = (Array.isArray(params.mode) ? params.mode[0] : params.mode) === "signup" ? "signup" : "login";
  const signup = mode === "signup";

  if (await getSession()) redirect(next);

  return (
    <PageShell>
      {/* on a laptop or desktop the whole login fits in one screen (100vh): the content is centred under the header */}
      <section className="relative isolate overflow-hidden bg-[#041a36] pb-44 pt-28 sm:pt-40 lg:flex lg:min-h-dvh lg:items-center lg:bg-transparent lg:pb-6 lg:pt-28">
        {/* Photo + car share one "cover" stage so the car stays on the road at every width */}
        <div aria-hidden="true" className="absolute inset-0 -z-20 overflow-hidden [container-type:size]">
          <div className="absolute bottom-0 left-0 aspect-[1717/916] w-[150cqw] mask-[linear-gradient(to_bottom,transparent,black_38%)] lg:w-[max(100cqw,calc(100cqh*1.8744))] lg:mask-none">
            <img
              src="/login-bg-1600.webp"
              srcSet="/login-bg-800.webp 800w, /login-bg-1600.webp 1600w"
              sizes="100vw"
              alt=""
              className="size-full"
              decoding="async"
            />
            <img
              src="/login-car.webp"
              alt=""
              width={345}
              height={211}
              className="absolute"
              style={{ left: "5.53%", top: "76.96%", width: "20.09%" }}
              decoding="async"
            />
          </div>
        </div>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-b from-[#030a12]/70 via-[#030a12]/35 to-[#030a12]/85 max-lg:to-[#030a12]/10" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-r from-[#030a12]/80 via-transparent to-transparent lg:from-[#030a12]/60" />

        <div className="shell relative grid items-center gap-8 sm:gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-16">
          <div className="lg:order-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#22d3ee]/40 bg-[#22d3ee]/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#22d3ee] backdrop-blur">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              {signup ? "Create your account" : "Secure customer login"}
            </span>
            <h1 className="mt-5! font-(family-name:--font-display) text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:mt-5! lg:text-5xl xl:text-[3.4rem]">
              {signup ? "Join Veera." : "Welcome back."}
              <span className="mt-1 block pb-2 italic">
                Your next ride is just{" "}
                <span className="relative inline-block bg-linear-to-r from-[#22d3ee] to-brand-bright bg-clip-text text-transparent">
                  one code away.
                  <span aria-hidden="true" className="absolute -bottom-1.5 left-0 h-[3px] w-full rounded-full bg-linear-to-r from-[#22d3ee] to-transparent" />
                </span>
              </span>
            </h1>
            <p className="mt-3! max-w-xl text-base text-white/75 sm:text-lg lg:mt-3! lg:text-base">
              {signup
                ? "Create a free account to book outstation cabs at fixed fares, pay online and keep all your trips in one place."
                : "Sign in to book outstation cabs at fixed fares, pay online and keep all your trips in one place."}
            </p>

            <ul className="mt-7 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 lg:mt-6 lg:gap-3">
              {benefits.map((b) => {
                const Icon = b.icon;
                const shortTitle = "shortTitle" in b ? b.shortTitle : b.title;
                return (
                <li key={b.title} className="flex gap-2.5 rounded-2xl p-3 sm:gap-3.5 sm:p-4 lg:p-3.5 border border-white/10 bg-white/[0.06] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur-md transition hover:border-brand-bright/30 hover:bg-white/[0.09]">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand-bright ring-1 ring-brand-bright/20 sm:size-10">
                    <Icon className="size-[18px] sm:size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] leading-snug font-bold sm:text-[15px]">
                      <span className="sm:hidden">{shortTitle}</span>
                      <span className="hidden sm:inline">{b.title}</span>
                    </p>
                    <p className="mt-0.5 text-[11.5px] leading-snug text-white/65 sm:text-[13px] sm:leading-relaxed">
                      <span className="sm:hidden">{b.shortText}</span>
                      <span className="hidden sm:inline">{b.text}</span>
                    </p>
                  </div>
                </li>
                );
              })}
            </ul>
          </div>

          {/* phones and tablets: the form comes first, above the headline and benefits */}
          <div className="order-first lg:order-2">
            <LoginForm key={mode} next={next} mode={mode} />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
