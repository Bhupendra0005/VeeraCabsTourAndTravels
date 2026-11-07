-- Admin panel: staff accounts, audit trail, editable site content.
-- Same rule as before: RLS on, no policies, no grants for anon/authenticated. Only the server (service role) reads these.

create table if not exists admin_users (
  id                   uuid primary key default gen_random_uuid(),
  email                text not null unique check (email = lower(email)),
  name                 text not null default '',
  -- scrypt$N$r$p$salt$hash  (never a plaintext password)
  password_hash        text not null,
  role                 text not null check (role in ('owner', 'staff')),
  active               boolean not null default true,
  must_change_password boolean not null default false,
  -- bumped on password change / "sign out everywhere"; old cookies stop working
  session_version      int not null default 1,
  failed_attempts      int not null default 0,
  locked_until         timestamptz,
  last_login_at        timestamptz,
  created_at           timestamptz not null default now()
);

create table if not exists admin_login_attempts (
  id          bigint generated always as identity primary key,
  email       text not null,
  ip_hash     text,
  success     boolean not null,
  created_at  timestamptz not null default now()
);
create index if not exists admin_login_attempts_ip_idx on admin_login_attempts (ip_hash, created_at desc);

create table if not exists admin_audit_log (
  id           bigint generated always as identity primary key,
  admin_id     uuid references admin_users(id) on delete set null,
  admin_email  text not null,
  action       text not null,
  entity       text,
  entity_id    text,
  meta         jsonb,
  ip_hash      text,
  created_at   timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx on admin_audit_log (created_at desc);

-- One JSON document per editable part of the website (contact details, fleet, FAQs, ...).
-- A missing row means "use the built-in default", so the site works with an empty table.
create table if not exists site_content (
  key         text primary key,
  value       jsonb not null,
  updated_by  text,
  updated_at  timestamptz not null default now()
);

alter table bookings add column if not exists admin_note text not null default '';

alter table admin_users          enable row level security;
alter table admin_login_attempts enable row level security;
alter table admin_audit_log      enable row level security;
alter table site_content         enable row level security;

revoke all on admin_users, admin_login_attempts, admin_audit_log, site_content from anon, authenticated;
