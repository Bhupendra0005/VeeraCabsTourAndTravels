-- Veera Tours & Travels: online booking schema.
-- All money columns are integers in PAISE (1 rupee = 100 paise).
-- Every table has RLS enabled with NO policies and no grants for anon/authenticated:
-- the browser never talks to these tables directly, only our server (service role) does.

create extension if not exists pgcrypto;

create table if not exists customers (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique check (email = lower(email)),
  created_at  timestamptz not null default now()
);

create table if not exists login_otps (
  id          uuid primary key default gen_random_uuid(),
  email       text not null check (email = lower(email)),
  code_hash   text not null,
  expires_at  timestamptz not null,
  attempts    int  not null default 0,
  consumed    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists login_otps_email_created_idx on login_otps (email, created_at desc);

create table if not exists routes (
  id              uuid primary key default gen_random_uuid(),
  from_city       text not null,
  to_city         text not null,
  distance_km     int  not null check (distance_km > 0),
  duration_hours  numeric(4,1) not null check (duration_hours > 0),
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (from_city, to_city)
);

create table if not exists route_fares (
  id                  uuid primary key default gen_random_uuid(),
  route_id            uuid not null references routes(id) on delete cascade,
  vehicle_type        text not null,
  fare_one_way        int  not null check (fare_one_way > 0),
  -- optional; when null the round-trip fare is 2 x the one-way fare
  fare_round_trip     int  check (fare_round_trip > 0),
  unique (route_id, vehicle_type)
);

create sequence if not exists invoice_seq start 1;

create table if not exists bookings (
  id               uuid primary key default gen_random_uuid(),
  ref              text not null unique,
  invoice_no       text not null unique
                     default ('VT/' || to_char(now() at time zone 'Asia/Kolkata', 'YY') || '/' || lpad(nextval('invoice_seq')::text, 5, '0')),
  customer_id      uuid not null references customers(id),
  route_id         uuid not null references routes(id),

  trip_type        text not null check (trip_type in ('one_way', 'round_trip')),
  from_city        text not null,
  to_city          text not null,
  pickup_address   text not null,
  drop_address     text not null default '',
  travel_date      date not null,
  travel_time      text not null check (travel_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  return_date      date,
  passengers       int  not null check (passengers between 1 and 20),
  vehicle_type     text not null,

  traveller_name   text not null,
  traveller_phone  text not null,
  traveller_email  text not null,

  base_fare        int  not null check (base_fare > 0),
  gst              int  not null check (gst >= 0),
  insurance        int  not null default 0 check (insurance >= 0),
  total            int  not null check (total > 0),
  pay_mode         text not null check (pay_mode in ('part', 'full')),
  advance_due      int  not null check (advance_due > 0),

  status           text not null default 'pending_payment'
                     check (status in ('pending_payment', 'confirmed', 'cancelled', 'completed', 'payment_failed')),
  terms_accepted_at timestamptz not null,
  confirmed_at     timestamptz,
  cancelled_at     timestamptz,
  refund_amount    int  not null default 0 check (refund_amount >= 0),
  created_at       timestamptz not null default now()
);
create index if not exists bookings_customer_idx on bookings (customer_id, created_at desc);

create table if not exists payments (
  id                    uuid primary key default gen_random_uuid(),
  booking_id            uuid not null references bookings(id) on delete cascade,
  kind                  text not null check (kind in ('advance', 'full', 'balance')),
  amount                int  not null check (amount > 0),
  razorpay_order_id     text not null unique,
  razorpay_payment_id   text unique,
  status                text not null default 'created'
                          check (status in ('created', 'paid', 'failed', 'refunded')),
  refund_id             text,
  created_at            timestamptz not null default now(),
  paid_at               timestamptz
);
create index if not exists payments_booking_idx on payments (booking_id);

alter table customers   enable row level security;
alter table login_otps  enable row level security;
alter table routes      enable row level security;
alter table route_fares enable row level security;
alter table bookings    enable row level security;
alter table payments    enable row level security;

revoke all on customers, login_otps, routes, route_fares, bookings, payments from anon, authenticated;
revoke all on sequence invoice_seq from anon, authenticated;
