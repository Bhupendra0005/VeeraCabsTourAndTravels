import type { Metadata } from "next";
import { CalendarDays, FileEdit, History, Layers, ListFilter, LogIn, LogOut, RotateCw, Search, ShieldAlert, Users } from "lucide-react";
import type { ReactNode } from "react";
import { ClearFiltersLink, EmptyPanel, FilterButtons, FilterLabel, FilterPanel, StatTile, filterControl, filterIcon } from "@/components/admin/list-parts";
import { SelectMenu } from "@/components/admin/pickers";
import { Alert, DataTable, PageHeader, Pagination } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/server/admin/guard";
import { PAGE_SIZE, pageParam } from "@/lib/server/admin/queries";
import { db } from "@/lib/server/core/db";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Audit log" };

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

type Entry = {
  id: number;
  admin_email: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

const RANGES = [
  { value: "", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

const stamp = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

function since(range: string): string | null {
  const now = Date.now();
  if (range === "today") {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(now));
    return new Date(`${day}T00:00:00+05:30`).toISOString();
  }
  if (range === "7d") return new Date(now - 7 * 86_400_000).toISOString();
  if (range === "30d") return new Date(now - 30 * 86_400_000).toISOString();
  return null;
}

/** Only characters that are safe inside a PostgREST filter value. */
const cleanQuery = (value: string | undefined) => (value ?? "").replace(/[^\p{L}\p{N}@._ -]/gu, "").trim().slice(0, 60);

function ActionBadge({ action }: { action: string }) {
  const failed = action.includes("failed");
  const meta: { tone: string; icon: ReactNode } = failed
    ? { tone: "bg-red-400/12 text-red-300 ring-red-400/25", icon: <ShieldAlert /> }
    : action.endsWith("login")
      ? { tone: "bg-emerald-400/12 text-emerald-300 ring-emerald-400/25", icon: <LogIn /> }
      : action.endsWith("logout")
        ? { tone: "bg-red-400/12 text-red-300 ring-red-400/25", icon: <LogOut /> }
        : action.includes("saved") || action.includes("created") || action.includes("changed") || action.includes("updated")
          ? { tone: "bg-sky-400/12 text-sky-300 ring-sky-400/25", icon: <FileEdit /> }
          : { tone: "bg-white/8 text-white/75 ring-white/12", icon: <History /> };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase ring-1 [&>svg]:size-3.5", meta.tone)}>
      {meta.icon}
      <span className="wrap-anywhere">{action}</span>
    </span>
  );
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdminPage("audit.view");
  const raw = await searchParams;
  const q = cleanQuery(one(raw.q));
  const range = RANGES.some((r) => r.value === one(raw.range)) ? (one(raw.range) ?? "") : "";
  const action = (one(raw.action) ?? "").slice(0, 60);
  const page = pageParam(one(raw.page));
  const start = (page - 1) * PAGE_SIZE;
  const filtered = Boolean(q || range || action);

  let query = db()
    .from("admin_audit_log")
    .select("id, admin_email, action, entity, entity_id, meta, created_at", { count: "exact" });
  if (q) query = query.or(`admin_email.ilike.%${q}%,action.ilike.%${q}%,entity.ilike.%${q}%,entity_id.ilike.%${q}%`);
  if (action) query = query.eq("action", action);
  const from = since(range);
  if (from) query = query.gte("created_at", from);

  const [list, total, logins, logouts, latest, actionsRes] = await Promise.all([
    query.order("created_at", { ascending: false }).range(start, start + PAGE_SIZE - 1),
    db().from("admin_audit_log").select("id", { count: "exact", head: true }),
    db().from("admin_audit_log").select("id", { count: "exact", head: true }).eq("action", "admin.login"),
    db().from("admin_audit_log").select("id", { count: "exact", head: true }).eq("action", "admin.logout"),
    db().from("admin_audit_log").select("created_at").order("created_at", { ascending: false }).limit(1),
    db().from("admin_audit_log").select("action").limit(5000),
  ]);
  if (list.error) console.error("Audit list failed", list.error);

  const rows = (list.data ?? []) as Entry[];
  const actions = [...new Set((actionsRes.data ?? []).map((r) => r.action as string))].sort();
  const actionOptions = [{ value: "", label: "All actions" }, ...actions.map((value) => ({ value, label: value }))];
  const lastAt = (latest.data?.[0]?.created_at as string | undefined) ?? null;
  const shownFrom = rows.length ? start + 1 : 0;
  const shownTo = start + rows.length;

  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ q, range, action, page: String(p) })) if (value) params.set(key, value);
    return `/admin/audit?${params.toString()}`;
  };

  return (
    <div className="grid gap-6">
      <PageHeader icon={<History />} title="Audit log" description="A record of all sign-ins and changes made in the admin panel." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile tone="blue" icon={<Users />} label="Total events" value={total.count ?? 0} />
        <StatTile tone="green" icon={<LogIn />} label="Logins" value={logins.count ?? 0} />
        <StatTile tone="red" icon={<LogOut />} label="Logouts" value={logouts.count ?? 0} />
        <StatTile tone="violet" icon={<CalendarDays />} label="Last activity" value={<span className="text-lg">{lastAt ? stamp(lastAt) : "-"}</span>} />
      </div>

      <FilterPanel label="Filter the audit log">
        <form action="/admin/audit" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1.2fr_auto] xl:items-end">
          <div>
            <FilterLabel htmlFor="a-q">Search</FilterLabel>
            <div className="group relative">
              <Search className={filterIcon} aria-hidden="true" />
              <input id="a-q" name="q" defaultValue={q} maxLength={60} className={filterControl} placeholder="Search by email, action or item..." />
            </div>
          </div>
          <div>
            <FilterLabel htmlFor="a-range">Period</FilterLabel>
            <SelectMenu id="a-range" name="range" size="lg" icon={<CalendarDays />} options={RANGES} defaultValue={range} />
          </div>
          <div>
            <FilterLabel htmlFor="a-action">Action</FilterLabel>
            <SelectMenu id="a-action" name="action" size="lg" icon={<Layers />} options={actionOptions} defaultValue={action} />
          </div>
          <FilterButtons resetHref="/admin/audit" submitIcon={<ListFilter aria-hidden="true" />} className="sm:col-span-2 xl:col-span-1" />
        </form>
      </FilterPanel>

      {list.error ? (
        <Alert tone="danger">Could not load the audit log. Please refresh.</Alert>
      ) : rows.length === 0 ? (
        <EmptyPanel
          art={<RotateCw className="size-16 text-brand-bright/70" aria-hidden="true" />}
          title={filtered ? "No events match" : "Nothing logged yet"}
          text={filtered ? "Try a different search or period." : "Sign-ins and changes made in the admin panel will appear here."}
          action={filtered ? <ClearFiltersLink href="/admin/audit" /> : null}
        />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-brand-bright/25 bg-linear-to-b from-[#0b1620] to-panel p-4 shadow-[0_0_44px_-22px_rgba(0,150,219,0.5)] sm:p-5">
          <DataTable
            rows={rows}
            rowKey={(row) => String(row.id)}
            columns={[
              {
                header: "When",
                primary: true,
                cell: (row) => (
                  <span className="inline-flex items-center gap-2.5">
                    <CalendarDays className="size-4 shrink-0 text-brand-bright" aria-hidden="true" /> {stamp(row.created_at)}
                  </span>
                ),
              },
              { header: "Who", cell: (row) => row.admin_email },
              { header: "Action", cell: (row) => <ActionBadge action={row.action} /> },
              { header: "Item", cell: (row) => [row.entity, row.entity_id].filter(Boolean).join(" · ") || <span className="text-muted">-</span> },
              {
                header: "Details",
                cell: (row) => (row.meta ? <code className="text-xs text-white/70 wrap-anywhere">{JSON.stringify(row.meta)}</code> : <span className="text-muted">-</span>),
              },
            ]}
          />
          <p className="mt-4 px-1 text-sm text-muted">
            Showing {shownFrom}-{shownTo} of {list.count ?? 0} {list.count === 1 ? "event" : "events"}
          </p>
          <Pagination page={page} pageSize={PAGE_SIZE} total={list.count ?? 0} hrefFor={hrefFor} />
        </section>
      )}
    </div>
  );
}
