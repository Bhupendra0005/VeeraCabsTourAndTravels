-- Driver and cab assignment + phone bookings.
--
-- 1. The owner fills in the driver and cab from Admin > Bookings > a booking; the customer sees them on the
--    ticket page, in the e-ticket PDF and by email.
-- 2. `source` records how a booking was made: 'online' (the website) or 'phone' (entered by the owner after a call).
--
-- Only new columns with safe defaults are added: existing bookings are untouched (no driver yet, source 'online').

alter table bookings add column if not exists driver_name        text not null default '' check (char_length(driver_name) <= 80);
alter table bookings add column if not exists driver_phone       text not null default '' check (driver_phone = '' or driver_phone ~ '^[6-9][0-9]{9}$');
alter table bookings add column if not exists cab_number         text not null default '' check (char_length(cab_number) <= 20);
alter table bookings add column if not exists cab_model          text not null default '' check (char_length(cab_model) <= 60);
alter table bookings add column if not exists driver_assigned_at timestamptz;
alter table bookings add column if not exists source             text not null default 'online' check (source in ('online', 'phone'));
