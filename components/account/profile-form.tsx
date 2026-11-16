"use client";

import { AlertCircle, BadgeCheck, CheckCircle2, Loader2, Mail, MapPin, Phone, Save, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { postJson } from "@/lib/payments/checkout-client";
import { cleanMobile } from "@/lib/utils/phone";

type Initial = { email: string; name: string; phone: string; city: string };

const input =
  "h-12 w-full rounded-2xl border border-white/15 bg-white/5 pl-11 pr-4 text-[15px] text-(--text) outline-none transition placeholder:text-white/30 hover:border-white/20 focus:border-brand focus:ring-4 focus:ring-brand/15 disabled:opacity-60";
const icon =
  "pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted transition-colors group-focus-within:text-brand-bright";

function Field({ label, htmlFor, hint, required, children }: { label: string; htmlFor: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="grid content-start gap-2">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold">
        {label}
        {required ? <span className="text-red-400"> *</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function ProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [city, setCity] = useState(initial.city);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const dirty = name.trim() !== initial.name || phone !== initial.phone || city.trim() !== initial.city;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setSaved(false);
    if (name.trim().length < 2) return setError("Please enter your full name.");
    if (!/^[6-9]\d{9}$/.test(phone)) return setError("Enter a valid 10-digit mobile number.");

    setBusy(true);
    setError("");
    try {
      await postJson("/api/account/profile", { name: name.trim(), phone, city: city.trim() });
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" htmlFor="profile-name" required>
          <div className="group relative">
            <UserRound className={icon} aria-hidden="true" />
            <input
              id="profile-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              placeholder="As on your ID"
              maxLength={80}
              className={input}
            />
          </div>
        </Field>

        <Field label="Mobile number" htmlFor="profile-phone" hint="Drivers and our team use this to reach you about trips." required>
          <div className="group relative">
            <Phone className={icon} aria-hidden="true" />
            <span className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 text-[15px] text-white/60">+91</span>
            <input
              id="profile-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={phone}
              onChange={(e) => {
                setPhone(cleanMobile(e.target.value));
                setSaved(false);
              }}
              placeholder="98765 43210"
              className={`${input} pl-21!`}
            />
          </div>
        </Field>

        <Field label="Email address" htmlFor="profile-email" hint="This is your login. It cannot be changed here." required>
          <div className="group relative">
            <Mail className={icon} aria-hidden="true" />
            <input id="profile-email" type="email" value={initial.email} readOnly disabled className={`${input} pr-28`} />
            <span className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
              <BadgeCheck className="size-3.5" aria-hidden="true" /> Verified
            </span>
          </div>
        </Field>

        <Field label="City (optional)" htmlFor="profile-city">
          <div className="group relative">
            <MapPin className={icon} aria-hidden="true" />
            <input
              id="profile-city"
              type="text"
              autoComplete="address-level2"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setSaved(false);
              }}
              placeholder="e.g. Pune"
              maxLength={80}
              className={input}
            />
          </div>
        </Field>
      </div>

      {error ? (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-400/10 px-3.5 py-2.5 text-sm text-red-200">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span className="wrap-anywhere">{error}</span>
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3.5 py-2.5 text-sm text-emerald-200">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" /> Your profile was saved.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy || !dirty}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-linear-to-r from-[#22d3ee] to-brand-bright px-7 text-[15px] font-bold text-[#04202c] shadow-[0_12px_32px_-10px_rgba(34,211,238,0.7)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:brightness-100"
        >
          {busy ? (
            <>
              <Loader2 className="size-4.5 animate-spin" aria-hidden="true" /> Saving...
            </>
          ) : (
            <>
              <Save className="size-4.5" aria-hidden="true" /> Save Changes
            </>
          )}
        </button>
        {dirty && !busy ? <span className="text-xs text-muted">You have unsaved changes.</span> : null}
      </div>
    </form>
  );
}
