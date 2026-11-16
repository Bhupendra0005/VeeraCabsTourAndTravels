-- Airport transfers, hourly rentals, extra stops and GST billing details on a booking.
-- Run this in the Supabase SQL editor (after 005) before deploying the new booking flow.

-- airport and hourly bookings have no row in `routes`; their fares live in the website content documents
alter table bookings alter column route_id drop not null;

alter table bookings drop constraint if exists bookings_trip_type_check;
alter table bookings add constraint bookings_trip_type_check
  check (trip_type in ('one_way', 'round_trip', 'airport_pickup', 'airport_drop', 'hourly'));

-- extra stops the customer asked for on an outstation trip, e.g. "Lonavala, Khandala"
alter table bookings add column if not exists stops text not null default '';

-- optional GST details for the invoice
alter table bookings add column if not exists gst_company text not null default '';
alter table bookings add column if not exists gstin text not null default ''
  check (gstin = '' or gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$');
