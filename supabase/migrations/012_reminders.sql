-- Reminder emails: a pickup reminder before the trip and a "how was your trip?" review reminder after it.
-- These two timestamps record when each was sent, so a customer never gets the same reminder twice
-- (they stay empty for existing bookings; the first run only looks at upcoming trips and trips from the last few days).

alter table bookings add column if not exists reminder_sent_at        timestamptz;
alter table bookings add column if not exists review_reminder_sent_at timestamptz;

create index if not exists bookings_reminder_idx on bookings (travel_date) where status in ('confirmed', 'completed');
