"use client";

import { Crown, Eye, EyeOff, KeyRound, Lock, Mail, Power, UserPlus, UserRound, Users, CalendarClock } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { FormMessage, SubmitButton } from "@/components/admin/form-parts";
import { filterControl, filterIcon } from "@/components/admin/list-parts";
import { SelectMenu } from "@/components/admin/pickers";
import { Alert } from "@/components/admin/ui";
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
  return (
    <form action={action} className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4" autoComplete="off">
      <label htmlFor={`pw-${member.id}`} className="text-[13px] font-semibold">
        New temporary password
      </label>
      <div className="group relative">
        <Lock className={filterIcon} aria-hidden="true" />
        <input id={`pw-${member.id}`} name="password" type={show ? "text" : "password"} required minLength={12} maxLength={128} autoComplete="new-password" className={`${filterControl} pr-11`} />
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
            <p className="mt-2 flex items-center gap-2 text-sm text-white/80 wrap-anywhere">
              <Mail className="size-4 shrink-0 text-white/45" aria-hidden="true" /> {member.email}
            </p>
            <p className="mt-1.5 flex items-center gap-2 text-sm text-white/80">
              <CalendarClock className="size-4 shrink-0 text-white/45" aria-hidden="true" /> Last sign-in: {member.lastLogin}
            </p>
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
          <p className="mb-2 text-[13px] font-semibold">Role</p>
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

export function CreateAdminForm() {
  const [state, action] = useActionState(createAdminAction, idle);
  const [show, setShow] = useState(false);
  const star = <span className="text-red-400"> *</span>;

  return (
    <section className={cn(panel, "p-5 sm:p-6")}>
      <PanelHead icon={<UserPlus />} title="Add a Team Member" text="They sign in with a temporary password and must choose their own straight away." />
      <form action={action} className="grid gap-5 sm:grid-cols-2" autoComplete="off">
        <div>
          <label htmlFor="t-name" className="mb-2 block text-[13px] font-semibold">
            Name{star}
          </label>
          <div className="group relative">
            <UserRound className={filterIcon} aria-hidden="true" />
            <input id="t-name" name="name" maxLength={80} className={filterControl} placeholder="Enter full name" />
          </div>
        </div>
        <div>
          <label htmlFor="t-email" className="mb-2 block text-[13px] font-semibold">
            Email{star}
          </label>
          <div className="group relative">
            <Mail className={filterIcon} aria-hidden="true" />
            <input id="t-email" name="email" type="email" required maxLength={254} className={filterControl} placeholder="Enter email address" />
          </div>
        </div>
        <div>
          <label htmlFor="t-role" className="mb-2 block text-[13px] font-semibold">
            Role{star}
          </label>
          <SelectMenu id="t-role" name="role" size="lg" icon={<Users />} defaultValue="staff" options={ROLE_OPTIONS} />
          <p className="mt-2 text-xs text-muted">Owners can manage team, settings and see the audit log. Staff can run bookings and the website.</p>
        </div>
        <div>
          <label htmlFor="t-pw" className="mb-2 block text-[13px] font-semibold">
            Temporary Password{star}
          </label>
          <div className="group relative">
            <Lock className={filterIcon} aria-hidden="true" />
            <input id="t-pw" name="password" type={show ? "text" : "password"} required minLength={12} maxLength={128} autoComplete="new-password" className={`${filterControl} pr-11`} placeholder="Enter temporary password" />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white">
              {show ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">12+ characters with upper and lower case, a number and a symbol.</p>
        </div>
        <div className="grid gap-3 sm:col-span-2">
          <FormMessage state={state} />
          <div>
            <SubmitButton pendingText="Adding..." className="h-12 rounded-xl px-6 shadow-[0_10px_28px_-10px_rgba(0,150,219,0.8)]">
              <UserPlus aria-hidden="true" /> Add Team Member
            </SubmitButton>
          </div>
        </div>
      </form>
    </section>
  );
}

/** Another admin: switch on/off, change role, reset their password. */
export function TeamRow({ member }: { member: TeamMember }) {
  const { pending, result, resetting, setResetting, resetState, resetAction, run } = useMemberActions(member);
  return (
    <li className="grid gap-4 rounded-2xl border border-white/10 bg-white/3 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar member={member} />
        <div className="min-w-0 flex-1 basis-48">
          <p className="font-semibold wrap-anywhere">{member.name || member.email}</p>
          <p className="text-sm text-muted wrap-anywhere">{member.email}</p>
          <p className="mt-1 text-xs text-muted">Last sign-in: {member.lastLogin}</p>
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
