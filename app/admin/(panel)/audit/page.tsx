import type { Metadata } from "next";
import {
  CalendarClock,
  CalendarDays,
  CircleCheck,
  CircleX,
  FileEdit,
  History,
  KeyRound,
  Layers,
  ListFilter,
  LogIn,
  LogOut,
  RotateCw,
  Search,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
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

/** "5 min ago", "3 h ago", "2 days ago", or the date for anything older than a week. */
function ago(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days <= 7 ? `${days} ${days === 1 ? "day" : "days"} ago` : new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

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

type Tone = "green" | "red" | "blue" | "amber" | "grey";
const TONES: Record<Tone, string> = {
  green: "bg-emerald-400/12 text-emerald-300 ring-emerald-400/25",
  red: "bg-red-400/12 text-red-300 ring-red-400/25",
  blue: "bg-sky-400/12 text-sky-300 ring-sky-400/25",
  amber: "bg-amber-400/12 text-amber-300 ring-amber-400/25",
  grey: "bg-white/8 text-white/75 ring-white/12",
};

/** Plain-English names for the actions we record. Anything not listed gets a readable name made from its code. */
const KNOWN: Record<string, { label: string; tone: Tone; icon: ReactNode }> = {
  "admin.login": { label: "Signed in", tone: "green", icon: <LogIn /> },
  "admin.logout": { label: "Signed out", tone: "grey", icon: <LogOut /> },
  "admin.login_failed": { label: "Failed sign-in", tone: "red", icon: <ShieldAlert /> },
  "admin.password_changed": { label: "Changed their password", tone: "amber", icon: <KeyRound /> },
  "content.saved": { label: "Saved website content", tone: "blue", icon: <FileEdit /> },
  "content.reset": { label: "Restored original content", tone: "amber", icon: <RotateCw /> },
  "customer.note_saved": { label: "Saved a customer note", tone: "blue", icon: <FileEdit /> },
  "booking.cancelled": { label: "Cancelled a booking", tone: "red", icon: <CircleX /> },
  "booking.completed": { label: "Marked a booking completed", tone: "green", icon: <CircleCheck /> },
  "booking.note_saved": { label: "Saved a booking note", tone: "blue", icon: <FileEdit /> },
  "booking.confirmation_resent": { label: "Re-sent a booking confirmation", tone: "blue", icon: <FileEdit /> },
  "booking.balance_recorded": { label: "Recorded a balance payment", tone: "green", icon: <CircleCheck /> },
  "booking.phone_created": { label: "Created a phone booking", tone: "green", icon: <CircleCheck /> },
  "driver.created": { label: "Added a driver", tone: "green", icon: <UserPlus /> },
  "driver.updated": { label: "Updated a driver", tone: "blue", icon: <FileEdit /> },
  "route.deleted": { label: "Deleted a route", tone: "red", icon: <Trash2 /> },
  "team.created": { label: "Added a team member", tone: "green", icon: <UserPlus /> },
  "team.role_changed": { label: "Changed a member's role", tone: "amber", icon: <Users /> },
  "team.password_reset": { label: "Reset a member's password", tone: "amber", icon: <KeyRound /> },
};

function describe(action: string) {
  const known = KNOWN[action];
  if (known) return known;
  const words = action.replace(/[._]/g, " ").trim();
  const label = words.charAt(0).toUpperCase() + words.slice(1);
  if (action.includes("failed")) return { label, tone: "red" as Tone, icon: <ShieldAlert /> };
  if (/deleted|cancel/.test(action)) return { label, tone: "red" as Tone, icon: <Trash2 /> };
  if (/created|added/.test(action)) return { label, tone: "green" as Tone, icon: <UserPlus /> };
  if (/saved|updated|changed/.test(action)) return { label, tone: "blue" as Tone, icon: <FileEdit /> };
  return { label, tone: "grey" as Tone, icon: <History /> };
}

function ActionChip({ action }: { action: string }) {
  const info = describe(action);
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 [&>svg]:size-3.5 [&>svg]:shrink-0", TONES[info.tone])}>
        {info.icon}
        <span className="wrap-anywhere">{info.label}</span>
      </span>
      <code className="px-1 text-[11px] text-muted">{action}</code>
    </span>
  );
}

function Person({ email }: { email: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-linear-to-br from-brand-bright to-[#04567f] text-sm font-extrabold text-white">{email.charAt(0).toUpperCase()}</span>
      <span className="min-w-0 wrap-anywhere">{email}</span>
    </span>
  );
}

const shortId = (id: string | null) => (id && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id) ? id.slice(0, 8) : id);

/** The item an event was about, e.g. "booking · VT7K2M9QXA". */
function itemText(row: Entry) {
  return [row.entity, shortId(row.entity_id)].filter(Boolean).join(" · ");
}

/** The extra facts of an event as small "name: value" chips instead of raw JSON. */
function Details({ meta }: { meta: Entry["meta"] }) {
  const entries = Object.entries(meta ?? {}).filter(([, v]) => v !== null && v !== "" && v !== undefined);
  if (entries.length === 0) return <span className="text-muted">-</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {entries.slice(0, 6).map(([key, value]) => {
        const text = typeof value === "object" ? JSON.stringify(value) : String(value);
        return (
          <span key={key} className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-white/75 ring-1 ring-white/10 wrap-anywhere">
            <span className="text-muted">{key.replace(/_/g, " ")}:</span> {text.length > 48 ? `${text.slice(0, 47)}…` : text}
          </span>
        );
      })}
      {entries.length > 6 ? <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-muted">+{entries.length - 6} more</span> : null}
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

  const [list, total, logins, failed, latest, actionsRes] = await Promise.all([
    query.order("created_at", { ascending: false }).range(start, start + PAGE_SIZE - 1),
    db().from("admin_audit_log").select("id", { count: "exact", head: true }),
    db().from("admin_audit_log").select("id", { count: "exact", head: true }).eq("action", "admin.login"),
    db().from("admin_audit_log").select("id", { count: "exact", head: true }).ilike("action", "%failed%"),
    db().from("admin_audit_log").select("created_at").order("created_at", { ascending: false }).limit(1),
    db().from("admin_audit_log").select("action").limit(5000),
  ]);
  if (list.error) console.error("Audit list failed", list.error);

  const rows = (list.data ?? []) as Entry[];
  const actions = [...new Set((actionsRes.data ?? []).map((r) => r.action as string))].sort();
  const actionOptions = [{ value: "", label: "All actions" }, ...actions.map((value) => ({ value, label: describe(value).label }))];
  const lastAt = (latest.data?.[0]?.created_at as string | undefined) ?? null;
  const shownFrom = rows.length ? start + 1 : 0;
  const shownTo = start + rows.length;

  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ q, range, action, page: String(p) })) if (value) params.set(key, value);
    return `/admin/audit?${params.toString()}`;
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader icon={<History />} title="Audit log" description="A record of all sign-ins and changes made in the admin panel: who did what, and when." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile tone="blue" icon={<History />} label="Total events" value={total.count ?? 0} />
        <StatTile tone="green" icon={<LogIn />} label="Sign-ins" value={logins.count ?? 0} />
        <StatTile tone={(failed.count ?? 0) > 0 ? "red" : "green"} icon={<ShieldAlert />} label="Failed attempts" value={failed.count ?? 0} hint="Wrong password or blocked" />
        <StatTile tone="violet" icon={<CalendarClock />} label="Last activity" value={<span className="text-lg">{lastAt ? ago(lastAt) : "-"}</span>} hint={lastAt ? stamp(lastAt) : undefined} />
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
        <section className="grid gap-4">
          <DataTable
            rows={rows}
            rowKey={(row) => String(row.id)}
            columns={[
              {
                header: "When",
                primary: true,
                cell: (row) => (
                  <span className="block whitespace-nowrap">
                    <span className="block font-semibold">{ago(row.created_at)}</span>
                    <span className="block text-xs font-normal text-muted">{stamp(row.created_at)}</span>
                  </span>
                ),
              },
              { header: "Who", cell: (row) => <Person email={row.admin_email} /> },
              { header: "What happened", cell: (row) => <ActionChip action={row.action} /> },
              { header: "Item", cell: (row) => itemText(row) || <span className="text-muted">-</span> },
              { header: "Details", cell: (row) => <Details meta={row.meta} /> },
            ]}
            card={(row) => {
              const info = describe(row.action);
              const item = itemText(row);
              return (
                <div className="grid h-full content-start gap-3 rounded-2xl border border-line bg-panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Person email={row.admin_email} />
                    <span className="shrink-0 text-right text-xs text-muted" title={stamp(row.created_at)}>
                      {ago(row.created_at)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 [&>svg]:size-3.5 [&>svg]:shrink-0", TONES[info.tone])}>
                      {info.icon}
                      <span className="wrap-anywhere">{info.label}</span>
                    </span>
                    {item ? <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-white/75 ring-1 ring-white/10 wrap-anywhere">{item}</span> : null}
                  </div>
                  {row.meta && Object.keys(row.meta).length ? <Details meta={row.meta} /> : null}
                  <div className="border-t border-line pt-2.5 text-[11px] text-muted">{stamp(row.created_at)}</div>
                </div>
              );
            }}
          />
          <div className="px-1 text-sm text-muted">
            Showing {shownFrom}-{shownTo} of {list.count ?? 0} {list.count === 1 ? "event" : "events"}
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={list.count ?? 0} hrefFor={hrefFor} />
        </section>
      )}
    </div>
  );
}
