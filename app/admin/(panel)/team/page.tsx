import type { Metadata } from "next";
import { Crown, ShieldAlert, UserRound, Users } from "lucide-react";
import { AddMemberButton, CurrentUserCard, TeamRow, type TeamMember } from "@/components/admin/team-manager";
import { StatTile } from "@/components/admin/list-parts";
import { Alert, EmptyState, PageHeader } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { isFuture } from "@/lib/server/admin/queries";
import { db } from "@/lib/server/core/db";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const me = await requireAdminPage("team.manage");
  const { data, error } = await db()
    .from("admin_users")
    .select("id, email, name, role, active, locked_until, last_login_at")
    .order("created_at");
  if (error) console.error("Team list failed", error);

  const members: TeamMember[] = (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    active: row.active,
    locked: isFuture(row.locked_until),
    lastLogin: row.last_login_at
      ? new Date(row.last_login_at).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })
      : "never",
    isYou: row.id === me.id,
  }));
  const you = members.find((m) => m.isYou);
  const others = members.filter((m) => !m.isYou);
  const owners = members.filter((m) => m.role === "owner").length;
  const attention = members.filter((m) => !m.active || m.locked).length;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader
        icon={<Users />}
        title="Team"
        description="Who can sign in to this admin panel, and what they can do."
        actions={<div className="max-sm:w-full max-sm:[&>button]:w-full"><AddMemberButton /></div>}
      />
      {error ? <Alert tone="danger">Could not load the team. Please refresh.</Alert> : null}

      {!error ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatTile tone="blue" icon={<Users />} label="Team members" value={members.length} />
          <StatTile tone="violet" icon={<Crown />} label="Owners" value={owners} hint="Full access" />
          <StatTile tone="green" icon={<UserRound />} label="Staff" value={members.length - owners} hint="Bookings and website" />
          <StatTile tone={attention ? "amber" : "green"} icon={<ShieldAlert />} label="Needs attention" value={attention} hint="Switched off or locked" />
        </div>
      ) : null}

      {you ? <CurrentUserCard member={you} /> : null}

      <section className="grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-(family-name:--font-display) text-xl font-bold">Other team members</h2>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-white/70">{others.length}</span>
        </div>
        {others.length === 0 ? (
          <EmptyState icon={<Users />} title="No other team members yet">
            Tap &quot;Add team member&quot; to give someone their own sign-in.
          </EmptyState>
        ) : (
          <ul className="grid gap-4 xl:grid-cols-2">
            {others.map((member) => (
              <TeamRow key={member.id} member={member} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
