-- 1. Drivers: the owner's own list of drivers and cabs, so an assignment is a dropdown choice instead of typing every time,
--    and trips / business can be shown per driver. Like every other table: RLS on, no policies, no grants (only our server reads it).
create table if not exists drivers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 80),
  phone       text not null check (phone ~ '^[6-9][0-9]{9}$'),
  cab_number  text not null default '' check (char_length(cab_number) <= 20),
  cab_model   text not null default '' check (char_length(cab_model) <= 60),
  note        text not null default '' check (char_length(note) <= 500),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index if not exists drivers_phone_idx on drivers (phone);
alter table drivers enable row level security;
revoke all on drivers from anon, authenticated;

-- which saved driver a booking was given to (the name/phone/cab on the booking stay as a copy, so history never changes)
alter table bookings add column if not exists driver_id uuid references drivers(id) on delete set null;
create index if not exists bookings_driver_idx on bookings (driver_id);

-- 2. Customers: a private note for the owner, and a block switch (a blocked customer cannot make new bookings).
alter table customers add column if not exists admin_note     text not null default '' check (char_length(admin_note) <= 1000);
alter table customers add column if not exists blocked        boolean not null default false;
alter table customers add column if not exists blocked_reason text not null default '' check (char_length(blocked_reason) <= 300);
alter table customers add column if not exists blocked_at     timestamptz;
