"use client";

import { AlertCircle, ArrowLeft, ArrowRight, Loader2, Mail, MailCheck, Phone, Send, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Turnstile } from "@/components/auth/turnstile";
import { postJson } from "@/lib/payments/checkout-client";
import { cn } from "@/lib/utils/cn";
import { cleanMobile } from "@/lib/utils/phone";

const CAPTCHA_REQUIRED = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const CODE_LENGTH = 6;

const primaryButton =
  "group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-linear-to-r from-[#22d3ee] to-brand-bright text-[15px] font-bold text-[#04202c] shadow-[0_12px_36px_-8px_rgba(34,211,238,0.7)] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100";

function MailShield() {
  return (
    <svg viewBox="0 0 120 100" className="h-[84px] w-[104px] drop-shadow-[0_8px_24px_rgba(34,211,238,0.45)]" aria-hidden="true">
      <defs>
        <linearGradient id="ms-env" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2fafe" />
          <stop offset="1" stopColor="#a9d8f0" />
        </linearGradient>
        <linearGradient id="ms-shield" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#0a8fd0" />
        </linearGradient>
      </defs>
      <rect x="10" y="30" width="84" height="58" rx="8" fill="url(#ms-env)" />
      <path d="M10 38 L52 66 L94 38 L94 34 Q94 30 90 30 L14 30 Q10 30 10 34 Z" fill="#cdeaf8" />
      <path d="M12 36 L52 63 L92 36" fill="none" stroke="#7fc3e6" strokeWidth="2" strokeLinecap="round" />
      <rect x="28" y="12" width="48" height="34" rx="5" fill="#fff" stroke="#bfe3f5" />
      <rect x="35" y="19" width="34" height="3.5" rx="1.75" fill="#3cb8f2" />
      <rect x="35" y="27" width="26" height="3.5" rx="1.75" fill="#8fd0ee" />
      <rect x="35" y="35" width="30" height="3.5" rx="1.75" fill="#b6e0f3" />
      <path d="M92 44 L112 51 V68 C112 80 103 87 92 92 C81 87 72 80 72 68 V51 Z" fill="url(#ms-shield)" stroke="#0b2230" strokeWidth="3" />
      <path d="M83 67 L90 74 L102 60" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const fieldClass =
  "h-12 w-full rounded-2xl border border-white/15 bg-white/5 pl-11 pr-4 text-[15px] text-(--text) outline-none transition placeholder:text-white/30 hover:border-white/20 focus:border-brand focus:ring-4 focus:ring-brand/15";

function Steps({ step, first = "Your email", className }: { step: "email" | "code"; first?: string; className?: string }) {
  const items = [
    { id: "email", label: first },
    { id: "code", label: "Verify code" },
  ] as const;
  return (
    <ol className={cn("mb-7 flex items-center justify-center gap-2 sm:gap-3", className)} aria-label="Progress">
      {items.map((item, index) => {
        const done = step === "code" && item.id === "email";
        const active = step === item.id;
        return (
          <li key={item.id} className="flex items-center gap-2 sm:gap-3" aria-current={active ? "step" : undefined}>
            <span
              className={cn(
                "grid size-7 place-items-center rounded-full text-xs font-bold ring-1 transition",
                active && "bg-[#22d3ee] text-[#04202c] ring-[#22d3ee]/60 shadow-[0_0_16px_rgba(34,211,238,0.6)]",
                done && "bg-[#22d3ee]/20 text-[#22d3ee] ring-[#22d3ee]/40",
                !active && !done && "bg-white/5 text-muted ring-white/10",
              )}
            >
              {done ? "✓" : index + 1}
            </span>
            <span className={cn("whitespace-nowrap text-[13px] font-semibold", active ? "text-white" : "text-muted")}>{item.label}</span>
            {index === 0 ? <span className="h-px w-5 bg-[#22d3ee]/60 sm:w-12" aria-hidden="true" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-400/10 px-3.5 py-2.5 text-sm text-red-200">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span className="[overflow-wrap:anywhere]">{message}</span>
    </p>
  );
}

export function LoginForm({
  next,
  mode = "login",
  onSuccess,
  initialEmail = "",
}: {
  /** Pre-fills the email box (for example the address already typed on the booking form). */
  initialEmail?: string;
  next: string;
  mode?: "login" | "signup";
  /** When set, the form is used inside another page (for example at checkout): it calls this instead of navigating. */
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const signup = mode === "signup";
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [token, setToken] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const onToken = useCallback((value: string) => setToken(value), []);
  const code = digits.join("");

  const sendCode = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (signup) {
      if (name.trim().length < 2) {
        setError("Please enter your full name.");
        return;
      }
      if (!/^[6-9]\d{9}$/.test(phone)) {
        setError("Enter a valid 10-digit mobile number.");
        return;
      }
    }
    if (CAPTCHA_REQUIRED && !token) {
      setError("Please complete the captcha.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await postJson("/api/auth/otp/request", { email, captchaToken: token });
      setDigits(Array(CODE_LENGTH).fill(""));
      setStep("code");
    } catch (e) {
      setError((e as Error).message);
      // a Turnstile token is single use
      setToken("");
      setCaptchaKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  };

  const verify = useCallback(
    async (value: string) => {
      setBusy(true);
      setError("");
      try {
        await postJson("/api/auth/otp/verify", {
          email,
          code: value,
          ...(signup ? { profile: { name: name.trim(), phone } } : {}),
        });
        if (onSuccess) {
          router.refresh();
          onSuccess();
          return;
        }
        router.replace(next);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
        setDigits(Array(CODE_LENGTH).fill(""));
        setBusy(false);
        boxes.current[0]?.focus();
      }
    },
    [email, name, next, onSuccess, phone, router, signup],
  );

  // the first box takes focus when the code step opens, and the form submits itself when the 6th digit lands
  useEffect(() => {
    if (step === "code") boxes.current[0]?.focus();
  }, [step]);

  const setDigit = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      setDigits((current) => current.map((d, i) => (i === index ? "" : d)));
      return;
    }
    const next = digits.slice();
    clean
      .slice(0, CODE_LENGTH - index)
      .split("")
      .forEach((char, offset) => {
        next[index + offset] = char;
      });
    setDigits(next);
    const focusAt = Math.min(index + clean.length, CODE_LENGTH - 1);
    boxes.current[focusAt]?.focus();
    if (next.every(Boolean) && !busy) void verify(next.join(""));
  };

  const onKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      boxes.current[index - 1]?.focus();
    } else if (event.key === "ArrowLeft" && index > 0) {
      boxes.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      boxes.current[index + 1]?.focus();
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    const filled = Array.from({ length: CODE_LENGTH }, (_, i) => pasted[i] ?? "");
    setDigits(filled);
    boxes.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
    if (pasted.length === CODE_LENGTH && !busy) void verify(pasted);
  };

  const backToEmail = () => {
    setStep("email");
    setDigits(Array(CODE_LENGTH).fill(""));
    setError("");
    setToken("");
    setCaptchaKey((k) => k + 1);
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-brand-bright/40 bg-[#07141f]/70 p-6 shadow-[0_0_0_1px_rgba(60,184,242,0.12),0_0_60px_-10px_rgba(34,211,238,0.35),0_30px_80px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-9 lg:p-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-bright to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 size-56 rounded-full bg-brand/20 blur-[80px]" />

      <div className="relative">
        {step === "email" && !onSuccess ? (
          <div role="tablist" aria-label="Log in or create account" className="mb-6 grid grid-cols-2 gap-1 rounded-full border border-white/10 bg-black/25 p-1 lg:mb-3">
            {(
              [
                { id: "login", label: "Log in", href: `/login?next=${encodeURIComponent(next)}` },
                { id: "signup", label: "Create account", href: `/login?mode=signup&next=${encodeURIComponent(next)}` },
              ] as const
            ).map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                role="tab"
                aria-selected={mode === tab.id}
                className={cn(
                  "rounded-full px-3 py-2 text-center text-sm font-bold transition",
                  mode === tab.id
                    ? "bg-linear-to-r from-[#22d3ee] to-brand-bright text-[#04202c] shadow-[0_6px_20px_-8px_rgba(34,211,238,0.8)]"
                    : "text-white/70 hover:text-white",
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        ) : null}

        {/* inside the checkout popup the close button sits in the top-right corner: keep the steps clear of it on phones */}
        <Steps step={step} first={signup ? "Your details" : "Your email"} className={onSuccess ? "pr-9 sm:pr-0" : undefined} />

        {step === "email" ? (
          <form onSubmit={sendCode} className="grid gap-5 lg:gap-3.5" noValidate>
            <div className="text-center">
              {/* the envelope picture is dropped on short laptop screens so the whole form stays in view */}
              <span className="relative mx-auto mb-3 grid size-28 place-items-center rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.18),transparent_70%)] lg:mb-0.5 lg:size-14 lg:[@media(max-height:940px)]:hidden">
                <MailShield />
              </span>
              <h2 className="font-(family-name:--font-display) text-2xl font-extrabold sm:text-[28px] lg:text-2xl">
                {signup ? "Create your account" : "Log in to continue"}
              </h2>
              <p className="mx-auto mt-2 max-w-xs text-sm text-white/65">
                {signup
                  ? "Tell us who you are and we will email you a 6-digit code to confirm. No password needed."
                  : "Enter your email and we will send you a 6-digit code. No password needed."}
              </p>
            </div>

            {signup ? (
              <>
                <div className="grid gap-2">
                  <label htmlFor="signup-name" className="text-[13px] font-semibold">
                    Full name
                  </label>
                  <div className="group relative">
                    <UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted transition-colors group-focus-within:text-brand-bright" aria-hidden="true" />
                    <input
                      id="signup-name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="As on your ID"
                      maxLength={80}
                      required
                      className={fieldClass}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="signup-phone" className="text-[13px] font-semibold">
                    Mobile number
                  </label>
                  <div className="group relative">
                    <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted transition-colors group-focus-within:text-brand-bright" aria-hidden="true" />
                    <span className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 text-[15px] text-white/60">+91</span>
                    <input
                      id="signup-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={phone}
                      onChange={(e) => setPhone(cleanMobile(e.target.value))}
                      placeholder="98765 43210"
                      required
                      className={`${fieldClass} pl-[5.25rem]!`}
                    />
                  </div>
                </div>
              </>
            ) : null}

            <div className="grid gap-2">
              <label htmlFor="login-email" className="text-[13px] font-semibold">
                Email address
              </label>
              <div className="group relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted transition-colors group-focus-within:text-brand-bright" aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  maxLength={254}
                  required
                  className={fieldClass}
                />
              </div>
            </div>

            <Turnstile key={captchaKey} onToken={onToken} />
            <ErrorNote message={error} />

            <button type="submit" className={primaryButton} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="size-4.5 animate-spin" aria-hidden="true" /> Sending code...
                </>
              ) : (
                <>
                  <Send className="size-4.5" aria-hidden="true" /> {signup ? "Create account" : "Send code"}{" "}
                  <ArrowRight className="size-4.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </>
              )}
            </button>

            <p className="text-center text-xs text-muted">
              {signup ? "By creating an account you agree to our" : "By continuing you agree to our"}{" "}
              <Link href="/terms" className="font-semibold text-[#22d3ee] underline underline-offset-2">
                Terms &amp; Conditions
              </Link>{" "}
              and{" "}
              <Link href="/privacy-policy" className="font-semibold text-[#22d3ee] underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </p>
          </form>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (code.length === CODE_LENGTH && !busy) void verify(code);
            }}
            className="grid gap-5"
            noValidate
          >
            <div className="flex items-start gap-3.5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand-bright ring-1 ring-brand-bright/25">
                <MailCheck className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="font-(family-name:--font-display) text-2xl font-extrabold sm:text-[28px]">Check your inbox</h2>
                <p className="mt-1.5 text-sm text-muted [overflow-wrap:anywhere]">
                  We sent a 6-digit code to <b className="text-white">{email}</b>. It is valid for 10 minutes.
                </p>
              </div>
            </div>

            <fieldset className="grid gap-2.5">
              <legend className="mb-1 text-[13px] font-semibold">Enter your code</legend>
              <div className="grid grid-cols-6 gap-2 sm:gap-3">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(node) => {
                      boxes.current[index] = node;
                    }}
                    value={digit}
                    onChange={(e) => setDigit(index, e.target.value)}
                    onKeyDown={(e) => onKeyDown(index, e)}
                    onPaste={onPaste}
                    onFocus={(e) => e.target.select()}
                    inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    maxLength={CODE_LENGTH}
                    aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
                    disabled={busy}
                    className={cn(
                      "aspect-square w-full min-w-0 rounded-xl border bg-white/[0.03] text-center font-(family-name:--font-display) text-xl font-extrabold text-white outline-none transition sm:text-2xl",
                      "focus:border-brand focus:bg-white/[0.06] focus:ring-4 focus:ring-brand/20 disabled:opacity-60",
                      digit ? "border-brand/60" : "border-white/10 hover:border-white/20",
                    )}
                  />
                ))}
              </div>
            </fieldset>

            <ErrorNote message={error} />

            <button type="submit" className={primaryButton} disabled={busy || code.length !== CODE_LENGTH}>
              {busy ? (
                <>
                  <Loader2 className="size-4.5 animate-spin" aria-hidden="true" /> Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4.5" aria-hidden="true" /> Verify &amp; continue
                </>
              )}
            </button>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <button type="button" onClick={backToEmail} className="inline-flex items-center gap-1.5 text-muted transition hover:text-white">
                <ArrowLeft className="size-4" aria-hidden="true" /> Use a different email
              </button>
              <button type="button" onClick={backToEmail} className="text-brand-bright underline underline-offset-2 hover:text-white">
                Did not get it? Send again
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
