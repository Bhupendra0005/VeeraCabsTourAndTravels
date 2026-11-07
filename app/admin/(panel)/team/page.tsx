import type { Metadata } from "next";
import { Users } from "lucide-react";
import { CreateAdminForm, CurrentUserCard, TeamRow, type TeamMember } from "@/components/admin/team-manager";
import { PeopleArt } from "@/components/admin/list-parts";
import { Alert, PageHeader } from "@/components/admin/ui";
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

  return (
    <div className="grid gap-6">
      <PageHeader icon={<Users />} title="Team" description="Who can sign in to this admin panel, and what they can do." />
      {error ? <Alert tone="danger">Could not load the team. Please refresh.</Alert> : null}

      {you ? <CurrentUserCard member={you} /> : null}

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <CreateAdminForm />

        <section className="rounded-2xl border border-brand-bright/25 bg-linear-to-b from-[#0c1a24] to-panel p-5 shadow-[0_0_44px_-20px_rgba(0,150,219,0.5)] sm:p-6">
          <div className="mb-6 flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-brand/25 to-brand/5 text-brand-bright ring-1 ring-brand-bright/25">
              <Users className="size-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-(family-name:--font-display) text-xl font-bold">Team Members</h2>
              <p className="text-sm text-muted">All users who can access the admin panel.</p>
            </div>
          </div>
          {others.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-8 text-center">
              <PeopleArt />
              <h3 className="mt-4 font-(family-name:--font-display) text-2xl font-extrabold">No team members yet</h3>
              <p className="mt-2 text-sm text-muted">Add your first team member to get started.</p>
            </div>
          ) : (
            <ul className="grid gap-4">
              {others.map((member) => (
                <TeamRow key={member.id} member={member} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
