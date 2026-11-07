"use client";

import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useActionState, useCallback, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/admin/form-parts";
import { Field } from "@/components/admin/ui";
import { Turnstile } from "@/components/auth/turnstile";
import { idle } from "@/lib/admin/action-state";
import { loginAction } from "@/lib/server/admin/actions/auth";

const field =
  "h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] text-[15px] text-(--text) placeholder:text-white/30 outline-none transition hover:border-white/20 focus:border-brand focus:bg-white/[0.05] focus:ring-4 focus:ring-brand/15";
const icon =
  "pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted transition-colors group-focus-within:text-brand-bright";

export function AdminLoginForm() {
  const [state, action] = useActionState(loginAction, idle);
  const [show, setShow] = useState(false);
  const [captcha, setCaptcha] = useState("");
  const onToken = useCallback((token: string) => setCaptcha(token), []);

  return (
    <form action={action} className="grid gap-5" noValidate>
      <Field label="Email" htmlFor="admin-email">
        <div className="group relative">
          <Mail className={icon} aria-hidden="true" />
          <input
            id="admin-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="you@example.com"
            required
            maxLength={254}
            className={`${field} pl-11`}
          />
        </div>
      </Field>

      <Field label="Password" htmlFor="admin-password">
        <div className="group relative">
          <Lock className={icon} aria-hidden="true" />
          <input
            id="admin-password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            required
            maxLength={256}
            className={`${field} px-11`}
          />
          <button
            type="button"
            onClick={() => setShow((value) => !value)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted transition hover:bg-white/5 hover:text-white"
          >
            {show ? <EyeOff className="size-4.5" aria-hidden="true" /> : <Eye className="size-4.5" aria-hidden="true" />}
          </button>
        </div>
      </Field>

      <Turnstile onToken={onToken} />
      <input type="hidden" name="captcha" value={captcha} />

      <FormMessage state={state} />
      <SubmitButton
        pendingText="Signing in..."
        className="group mt-1 h-12 w-full rounded-xl! bg-linear-to-r from-brand to-brand-bright text-[15px]! shadow-[0_10px_30px_-8px_rgba(0,150,219,0.7)] hover:brightness-110"
      >
        Sign in
        <ArrowRight className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </SubmitButton>
    </form>
  );
}
