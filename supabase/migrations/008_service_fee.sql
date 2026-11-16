-- Optional per-booking service fee (shown in the fare break-up under "Taxes & Fees", like MakeMyTrip).
-- Amount in PAISE. 0 for every booking made before the owner turns the fee on in Admin > Online booking.
alter table bookings add column if not exists service_fee int not null default 0 check (service_fee >= 0);
