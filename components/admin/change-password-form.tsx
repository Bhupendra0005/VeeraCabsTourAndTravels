"use client";

import { Check, CheckCircle2, Circle, Eye, EyeOff, Info, KeyRound, Lock, RefreshCw, ShieldCheck } from "lucide-react";
import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/admin/form-parts";
import { filterControl, filterIcon } from "@/components/admin/list-parts";
import { idle } from "@/lib/admin/action-state";
import { changePasswordAction } from "@/lib/server/admin/actions/auth";
import { cn } from "@/lib/utils/cn";

function PasswordField({
  id,
  name,
  label,
  icon,
  placeholder,
  autoComplete,
  minLength,
  maxLength,
  onValue,
  hint,
}: {
  id: string;
  name: string;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  autoComplete: string;
  minLength?: number;
  maxLength: number;
  onValue?: (value: string) => void;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13px] font-semibold">
        {label} <span className="text-red-400">*</span>
      </label>
      <div className="group relative">
        <span className={cn(filterIcon, "[&>svg]:size-4")}>{icon}</span>
        <input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={onValue ? (e) => onValue(e.target.value) : undefined}
          className={`${filterControl} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-white/50 transition hover:bg-white/5 hover:text-white"
        >
          {show ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </div>
      {hint ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-muted">
          <Info className="size-3.5 shrink-0" aria-hidden="true" /> {hint}
        </p>
      ) : null}
    </div>
  );
}

const rules: { label: string; test: (value: string) => boolean }[] = [
  { label: "At least 12 characters", test: (v) => v.length >= 12 },
  { label: "Upper & lower case letters (A-Z, a-z)", test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { label: "At least one number (0-9)", test: (v) => /\d/.test(v) },
  { label: "At least one symbol (! @ # $ etc.)", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, idle);
  const [next, setNext] = useState("");
  const results = rules.map((rule) => rule.test(next));
  const allGood = results.every(Boolean);

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:divide-x lg:divide-white/10" autoComplete="off">
      <div className="grid content-start gap-5 lg:pr-8">
        <PasswordField id="pw-current" name="current" label="Current password" icon={<KeyRound />} placeholder="Enter current password" autoComplete="current-password" maxLength={256} />
        <PasswordField
          id="pw-next"
          name="next"
          label="New password"
          icon={<Lock />}
          placeholder="Enter new password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          onValue={setNext}
          hint="At least 12 characters, with upper and lower case, a number and a symbol."
        />
        <PasswordField id="pw-confirm" name="confirm" label="Confirm new password" icon={<Lock />} placeholder="Confirm new password" autoComplete="new-password" minLength={12} maxLength={128} />
        <FormMessage state={state} />
        <div>
          <SubmitButton pendingText="Updating..." className="h-12 rounded-xl px-7 shadow-[0_10px_28px_-10px_rgba(0,150,219,0.8)]">
            <RefreshCw aria-hidden="true" /> Update Password
          </SubmitButton>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-5 lg:pl-8">
        <span
          className={cn(
            "relative grid size-28 place-items-center rounded-full transition",
            allGood ? "bg-emerald-400/10 text-emerald-300 shadow-[0_0_50px_-8px_rgba(52,211,153,0.6)]" : "bg-brand/10 text-brand-bright shadow-[0_0_50px_-10px_rgba(0,150,219,0.7)]",
          )}
          aria-hidden="true"
        >
          {allGood ? <ShieldCheck className="size-14" /> : <Lock className="size-14" />}
        </span>
        <ul className="grid gap-3 text-sm" aria-label="Password requirements">
          {rules.map((rule, index) => (
            <li key={rule.label} className={cn("flex items-center gap-3 transition-colors", results[index] ? "text-emerald-300" : "text-white/80")}>
              {results[index] ? <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" /> : <Circle className="size-5 shrink-0 text-white/30" aria-hidden="true" />}
              {rule.label}
              <span className="sr-only">{results[index] ? " (met)" : " (not met yet)"}</span>
            </li>
          ))}
        </ul>
        {next && allGood ? (
          <p className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
            <Check className="size-4" aria-hidden="true" /> Strong enough
          </p>
        ) : null}
      </div>
    </form>
  );
}
