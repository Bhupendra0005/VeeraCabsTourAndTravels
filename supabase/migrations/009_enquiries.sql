-- Website enquiries (contact form and "ask about a route / tour / vehicle" buttons).
-- Before this, the contact form only opened WhatsApp and nothing was kept, so the owner could not see leads.
-- Like every other table: RLS on, no policies, no grants. Only our server (service role) reads or writes it.

create table if not exists enquiries (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 1 and 80),
  phone       text not null check (phone ~ '^[6-9][0-9]{9}$'),
  topic       text not null default '' check (char_length(topic) <= 60),
  message     text not null default '' check (char_length(message) <= 1000),
  -- new -> contacted -> closed. Changed from Admin > Enquiries.
  status      text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  -- where it came from, e.g. 'contact_form'
  source      text not null default 'contact_form' check (char_length(source) <= 40),
  -- keyed hash of the sender's IP, only used to limit spam (never the raw address)
  ip_hash     text
);

create index if not exists enquiries_created_idx on enquiries (created_at desc);
create index if not exists enquiries_status_idx on enquiries (status, created_at desc);
create index if not exists enquiries_ip_idx on enquiries (ip_hash, created_at desc);

alter table enquiries enable row level security;
revoke all on enquiries from anon, authenticated;
