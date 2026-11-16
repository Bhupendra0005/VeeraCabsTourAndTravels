-- MakeMyTrip-style cab booking: traveller gender, bags, special-request add-ons and coupons.
-- All money columns stay integers in PAISE. Run this in the Supabase SQL editor before deploying the new booking flow.

alter table bookings add column if not exists traveller_gender text not null default ''
  check (traveller_gender in ('', 'male', 'female', 'other'));
alter table bookings add column if not exists bags int not null default 0
  check (bags between 0 and 40);
-- amount of paid special requests (roof carrier, driver language...) and their names
alter table bookings add column if not exists addons_total int not null default 0 check (addons_total >= 0);
alter table bookings add column if not exists addons text not null default '';
-- coupon applied at checkout; discount is the amount taken off the fare before GST
alter table bookings add column if not exists coupon_code text not null default '';
alter table bookings add column if not exists discount int not null default 0 check (discount >= 0);
