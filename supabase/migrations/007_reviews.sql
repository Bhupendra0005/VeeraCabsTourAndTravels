-- Customer reviews: one review per completed trip, written by the customer who booked it.
-- Like every other table, RLS is on with no policies and no grants: only our server (service role) touches it.
-- `published` lets the owner hide a review from the website without deleting it.

create table if not exists reviews (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null unique references bookings(id) on delete cascade,
  customer_id     uuid not null references customers(id),
  vehicle_type    text not null,
  -- first name and last initial only, so the website never shows a full name
  reviewer_name   text not null,
  cab_rating      int  not null check (cab_rating between 1 and 5),
  driver_rating   int  not null check (driver_rating between 1 and 5),
  tags            text[] not null default '{}',
  comment         text not null default '' check (char_length(comment) <= 600),
  published       boolean not null default true,
  created_at      timestamptz not null default now()
);

create index if not exists reviews_vehicle_idx on reviews (vehicle_type, created_at desc) where published;
create index if not exists reviews_created_idx on reviews (created_at desc);

alter table reviews enable row level security;
revoke all on reviews from anon, authenticated;
