"use client";

import { Check, Copy, Crown, Eye, EyeOff, KeyRound, Lock, Mail, Power, UserPlus, UserRound, Users, CalendarClock, Wand2, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { FormMessage, SubmitButton } from "@/components/admin/form-parts";
import { filterControl, filterIcon } from "@/components/admin/list-parts";
import { SelectMenu } from "@/components/admin/pickers";
import { Alert, Button } from "@/components/admin/ui";
import { idle, type ActionState } from "@/lib/admin/action-state";
import {
  createAdminAction,
  resetAdminPasswordAction,
  setAdminActiveAction,
  setAdminRoleAction,
} from "@/lib/server/admin/actions/team";
import { cn } from "@/lib/utils/cn";

const ROLE_OPTIONS = [
  { value: "staff", label: "Staff" },
  { value: "owner", label: "Owner" },
] as const;

export type TeamMember = {
  id: string;
  email: string;
  name: string;
  role: "owner" | "staff";
  active: boolean;
  locked: boolean;
  lastLogin: string;
  isYou: boolean;
};

const panel = "rounded-2xl border border-brand-bright/25 bg-linear-to-b from-[#0c1a24] to-panel shadow-[0_0_44px_-20px_rgba(0,150,219,0.5)]";

function PanelHead({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-brand/25 to-brand/5 text-brand-bright ring-1 ring-brand-bright/25 [&>svg]:size-6">{icon}</span>
      <div className="min-w-0">
        <h2 className="font-(family-name:--font-display) text-xl font-bold">{title}</h2>
        <p className="text-sm text-muted">{text}</p>
      </div>
    </div>
  );
}

function Pill({ tone, children, icon }: { tone: "blue" | "green" | "red" | "amber" | "grey"; children: React.ReactNode; icon?: React.ReactNode }) {
  const tones = {
    blue: "bg-sky-400/10 text-sky-300 ring-sky-400/25",
    green: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25",
    red: "bg-red-400/10 text-red-300 ring-red-400/25",
    amber: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
    grey: "bg-white/6 text-white/60 ring-white/10",
  } as const;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase ring-1 [&>svg]:size-3.5", tones[tone])}>
      {icon}
      {children}
    </span>
  );
}

function Avatar({ member, size = "md" }: { member: TeamMember; size?: "md" | "lg" }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-linear-to-br from-brand-bright to-[#04567f] font-extrabold text-white shadow-[0_8px_24px_-8px_rgba(0,150,219,0.8)] ring-4 ring-white/8",
        size === "lg" ? "size-20 text-3xl" : "size-12 text-lg",
      )}
    >
      {(member.name || member.email).charAt(0).toUpperCase()}
    </span>
  );
}

function RoleSelect({ member, disabled, onChange }: { member: TeamMember; disabled: boolean; onChange: (role: string) => void }) {
  return <SelectMenu id={`role-${member.id}`} size="lg" icon={<Users />} defaultValue={member.role} disabled={disabled} onChange={onChange} className="min-w-44" options={ROLE_OPTIONS} />;
}

function useMemberActions(member: TeamMember) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionState | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetState, resetAction] = useActionState(resetAdminPasswordAction.bind(null, member.id), idle);
  const run = (task: () => Promise<ActionState>) =>
    start(async () => {
      setResult(await task());
    });
  return { pending, result, resetting, setResetting, resetState, resetAction, run };
}

function ResetForm({ member, state, action }: { member: TeamMember; state: ActionState; action: (formData: FormData) => void }) {
  const [show, setShow] = useState(false);
  // controlled: a form action wipes plain inputs, which would throw away the password when it is refused as too weak
  const [password, setPassword] = useState("");
  useEffect(() => {
    if (state.ok) setPassword("");
  }, [state]);
  return (
    <form action={action} className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4" autoComplete="off">
      <label htmlFor={`pw-${member.id}`} className="text-[13px] font-semibold">
        New temporary password
      </label>
      <div className="group relative">
        <Lock className={filterIcon} aria-hidden="true" />
        <input id={`pw-${member.id}`} name="password" value={password} onChange={(event) => setPassword(event.target.value)} type={show ? "text" : "password"} required minLength={12} maxLength={128} autoComplete="new-password" className={`${filterControl} pr-11`} />
        <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white">
          {show ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </div>
      <p className="text-xs text-muted">They will be signed out and asked to choose their own password.</p>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingText="Setting..." className="h-11 rounded-xl px-5">
          Set temporary password
        </SubmitButton>
      </div>
    </form>
  );
}

const ghostBtn =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 [&>svg]:size-4";

/** The signed-in admin: details on the left, role and password on the right. */
export function CurrentUserCard({ member }: { member: TeamMember }) {
  const { pending, result, resetting, setResetting, resetState, resetAction, run } = useMemberActions(member);
  return (
    <section className={cn(panel, "p-5 sm:p-6")}>
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand-bright ring-1 ring-brand-bright/20">
          <UserRound className="size-5" aria-hidden="true" />
        </span>
        <h2 className="font-(family-name:--font-display) text-lg font-bold">Current User</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:divide-x lg:divide-white/10">
        <div className="flex flex-wrap items-center gap-5 lg:pr-6">
          <Avatar member={member} size="lg" />
          <div className="min-w-0 flex-1 basis-56">
            <p className="font-(family-name:--font-display) text-2xl font-bold wrap-anywhere">
              {member.name || "Owner"} <span className="text-sm font-normal text-muted">(you)</span>
            </p>
            <div className="mt-2 flex items-center gap-2 text-sm text-white/80 wrap-anywhere">
              <Mail className="size-4 shrink-0 text-white/45" aria-hidden="true" /> {member.email}
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-sm text-white/80">
              <CalendarClock className="size-4 shrink-0 text-white/45" aria-hidden="true" /> Last sign-in: {member.lastLogin}
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Pill tone="blue" icon={<Crown />}>
              {member.role}
            </Pill>
            <Pill tone={member.active ? "green" : "red"}>
              <span className={cn("size-2 rounded-full", member.active ? "bg-emerald-400" : "bg-red-400")} aria-hidden="true" />
              {member.active ? "Active" : "Off"}
            </Pill>
          </div>
        </div>

        <div className="lg:pl-6">
          <div className="mb-2 text-[13px] font-semibold">Role</div>
          <div className="flex flex-wrap gap-3">
            <RoleSelect member={member} disabled={pending} onChange={(next) => run(() => setAdminRoleAction(member.id, next))} />
            <button type="button" onClick={() => setResetting((v) => !v)} className={ghostBtn}>
              <KeyRound aria-hidden="true" /> Reset Password
            </button>
          </div>
        </div>
      </div>

      {resetting ? <div className="mt-5"><ResetForm member={member} state={resetState} action={resetAction} /></div> : null}
      {result?.error ? <div className="mt-4"><Alert tone="danger">{result.error}</Alert></div> : null}
      {result?.ok && result.message ? <div className="mt-4"><Alert tone="success">{result.message}</Alert></div> : null}
    </section>
  );
}

/** "Add team member" button: the form opens in a popup and closes itself once the member is added. */
export function AddMemberButton() {
  const ref = useRef<HTMLDialogElement>(null);
  const [round, setRound] = useState(0);
  const close = () => {
    ref.current?.close();
    setRound((n) => n + 1);
  };
  return (
    <>
      <Button onClick={() => ref.current?.showModal()}>
        <UserPlus aria-hidden="true" /> Add team member
      </Button>
      <dialog
        ref={ref}
        aria-labelledby="add-member-title"
        onClick={(e) => {
          if (e.target === ref.current) close();
        }}
        className="m-auto w-[calc(100%-1.5rem)] max-w-2xl rounded-2xl border border-brand-bright/30 bg-panel p-0 text-(--text) shadow-[0_0_60px_-10px_rgba(0,150,219,0.5)] backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-start gap-3 border-b border-white/10 p-5 sm:px-6">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-bright ring-1 ring-brand-bright/20">
            <UserPlus className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="add-member-title" className="font-(family-name:--font-display) text-lg font-bold">
              Add a team member
            </h2>
            <div className="text-sm text-muted">They sign in with a temporary password and must choose their own straight away.</div>
          </div>
          <button type="button" onClick={close} aria-label="Close" className="grid size-9 shrink-0 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto p-5 sm:p-6">
          <CreateAdminForm key={round} bare onDone={close} />
        </div>
      </dialog>
    </>
  );
}

export function CreateAdminForm({ bare, onDone }: { bare?: boolean; onDone?: () => void }) {
  const [state, action] = useActionState(createAdminAction, idle);
  const [show, setShow] = useState(false);
  const [fields, setFields] = useState({ name: "", email: "", password: "" });
  const [role, setRole] = useState<"staff" | "owner">("staff");
  const [copied, setCopied] = useState(false);
  const setField = (key: "name" | "email" | "password") => (event: { target: { value: string } }) => setFields((current) => ({ ...current, [key]: event.target.value }));
  // controlled: a form action wipes plain inputs, so a refused save (weak password, duplicate email) would lose everything typed
  useEffect(() => {
    if (state.ok) {
      setFields({ name: "", email: "", password: "" });
      setRole("staff");
      onDone?.();
    }
  }, [state, onDone]);
  const star = <span className="text-red-400"> *</span>;
  const pw = fields.password;
  const checks: [string, boolean][] = [
    ["12+ characters", pw.length >= 12],
    ["Upper and lower case", /[a-z]/.test(pw) && /[A-Z]/.test(pw)],
    ["A number", /\d/.test(pw)],
    ["A symbol", /[^A-Za-z0-9]/.test(pw)],
  ];
  const score = checks.filter(([, ok]) => ok).length;

  /** A random password that passes every rule, made in the browser with the secure random generator. */
  const generate = () => {
    const sets = ["abcdefghijkmnopqrstuvwxyz", "ABCDEFGHJKLMNPQRSTUVWXYZ", "23456789", "!@#$%&*?"];
    const all = sets.join("");
    const random = (n: number) => {
      const buffer = new Uint32Array(1);
      let value = 0;
      // rejection sampling so every character is equally likely
      const limit = Math.floor(0x100000000 / n) * n;
      do {
        crypto.getRandomValues(buffer);
        value = buffer[0];
      } while (value >= limit);
      return value % n;
    };
    const chars = sets.map((set) => set[random(set.length)]);
    while (chars.length < 16) chars.push(all[random(all.length)]);
    for (let i = chars.length - 1; i > 0; i -= 1) {
      const j = random(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    setFields((current) => ({ ...current, password: chars.join("") }));
    setShow(true);
  };
  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(fields.password);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // the password is visible when generated; copying by hand still works
    }
  };
  const content = (
    <>
      {bare ? null : <PanelHead icon={<UserPlus />} title="Add a Team Member" text="They sign in with a temporary password and must choose their own straight away." />}
      <form action={action} className="grid gap-5 sm:grid-cols-2" autoComplete="off">
        <div>
          <label htmlFor="t-name" className="mb-2 block text-[13px] font-semibold">
            Name{star}
          </label>
          <div className="group relative">
            <UserRound className={filterIcon} aria-hidden="true" />
            <input id="t-name" name="name" value={fields.name} onChange={setField("name")} maxLength={80} className={filterControl} placeholder="Enter full name" />
          </div>
        </div>
        <div>
          <label htmlFor="t-email" className="mb-2 block text-[13px] font-semibold">
            Email{star}
          </label>
          <div className="group relative">
            <Mail className={filterIcon} aria-hidden="true" />
            <input id="t-email" name="email" value={fields.email} onChange={setField("email")} type="email" required maxLength={254} className={filterControl} placeholder="Enter email address" />
          </div>
        </div>
        <div className="sm:col-span-2">
          <div id="t-role-label" className="mb-2 block text-[13px] font-semibold">
            Role{star}
          </div>
          <input type="hidden" name="role" value={role} />
          <div role="radiogroup" aria-labelledby="t-role-label" className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["staff", UserRound, "Staff", "Runs bookings, enquiries, drivers and the website."],
                ["owner", Crown, "Owner", "Everything staff can do, plus team, settings and the audit log."],
              ] as const
            ).map(([value, Icon, title, text]) => {
              const on = role === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setRole(value)}
                  className={cn(
                    "relative flex items-start gap-3 rounded-xl border p-4 text-left transition",
                    on ? "border-brand-bright/60 bg-brand/10 shadow-[0_0_30px_-14px_rgba(0,150,219,0.7)]" : "border-white/10 bg-white/3 hover:border-white/25",
                  )}
                >
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl [&>svg]:size-5", on ? "bg-brand/25 text-brand-bright" : "bg-white/6 text-white/55")}>
                    <Icon aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{title}</span>
                    <span className="block text-[13px] leading-snug text-muted">{text}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn("grid size-5 shrink-0 place-items-center rounded-full border transition", on ? "border-transparent bg-brand text-white" : "border-white/25 text-transparent")}
                  >
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="sm:col-span-2">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <label htmlFor="t-pw" className="block text-[13px] font-semibold">
              Temporary Password{star}
            </label>
            <button type="button" onClick={generate} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-semibold text-brand-bright transition hover:bg-brand/10">
              <Wand2 className="size-4" aria-hidden="true" /> Generate a strong one
            </button>
          </div>
          <div className="group relative">
            <Lock className={filterIcon} aria-hidden="true" />
            <input id="t-pw" name="password" value={fields.password} onChange={setField("password")} type={show ? "text" : "password"} required minLength={12} maxLength={128} autoComplete="new-password" className={`${filterControl} pr-24`} placeholder="Enter temporary password" />
            <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 gap-0.5">
              {fields.password ? (
                <button type="button" onClick={copyPassword} aria-label="Copy password" title="Copy password" className="rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white">
                  {copied ? <Check className="size-4 text-emerald-300" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                </button>
              ) : null}
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} className="rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white">
                {show ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1.5" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={cn("h-1.5 rounded-full transition", i < score ? (score === 4 ? "bg-emerald-400" : score >= 2 ? "bg-amber-400" : "bg-red-400") : "bg-white/10")} />
            ))}
          </div>
          <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Password rules">
            {checks.map(([label, ok]) => (
              <li key={label} className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition", ok ? "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25" : "bg-white/5 text-white/55 ring-white/10")}>
                {ok ? <Check className="size-3" aria-hidden="true" /> : <span className="size-1.5 rounded-full bg-white/30" aria-hidden="true" />} {label}
              </li>
            ))}
          </ul>
          <div className="mt-2 text-xs text-muted">Share it with them safely (for example on a call). They must choose their own password at first sign-in.</div>
        </div>
        <div className="grid gap-3 border-t border-white/10 pt-5 sm:col-span-2">
          <FormMessage state={state} />
          <div className="flex flex-wrap justify-end gap-2">
            {onDone ? (
              <Button variant="secondary" className="h-12 rounded-xl px-5 max-sm:flex-1" onClick={onDone}>
                Cancel
              </Button>
            ) : null}
            <SubmitButton pendingText="Adding..." className="h-12 rounded-xl px-6 shadow-[0_10px_28px_-10px_rgba(0,150,219,0.8)] max-sm:flex-1">
              <UserPlus aria-hidden="true" /> Add Team Member
            </SubmitButton>
          </div>
        </div>
      </form>
    </>
  );
  return bare ? <div>{content}</div> : <section className={cn(panel, "p-5 sm:p-6")}>{content}</section>;
}

/** Another admin: switch on/off, change role, reset their password. */
export function TeamRow({ member }: { member: TeamMember }) {
  const { pending, result, resetting, setResetting, resetState, resetAction, run } = useMemberActions(member);
  return (
    <li className={cn("grid content-start gap-4 rounded-2xl border bg-white/3 p-4 sm:p-5", member.active ? "border-white/10" : "border-dashed border-white/15 opacity-85")}>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar member={member} />
        <div className="min-w-0 flex-1 basis-48">
          <div className="font-semibold wrap-anywhere">{member.name || member.email}</div>
          <div className="text-sm text-muted wrap-anywhere">{member.email}</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" /> Last sign-in: {member.lastLogin}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill tone={member.role === "owner" ? "blue" : "grey"} icon={member.role === "owner" ? <Crown /> : undefined}>
            {member.role}
          </Pill>
          <Pill tone={member.active ? "green" : "red"}>{member.active ? "Active" : "Off"}</Pill>
          {member.locked ? <Pill tone="amber">Locked</Pill> : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <RoleSelect member={member} disabled={pending} onChange={(next) => run(() => setAdminRoleAction(member.id, next))} />
        <button type="button" disabled={pending} onClick={() => run(() => setAdminActiveAction(member.id, !member.active))} className={cn(ghostBtn, !member.active && "border-transparent bg-brand text-white hover:bg-brand-bright")}>
          <Power aria-hidden="true" /> {member.active ? "Switch off" : "Switch on"}
        </button>
        <button type="button" onClick={() => setResetting((v) => !v)} className={ghostBtn}>
          <KeyRound aria-hidden="true" /> Reset password
        </button>
      </div>

      {resetting ? <ResetForm member={member} state={resetState} action={resetAction} /> : null}
      {result?.error ? <Alert tone="danger">{result.error}</Alert> : null}
      {result?.ok && result.message ? <Alert tone="success">{result.message}</Alert> : null}
    </li>
  );
}
