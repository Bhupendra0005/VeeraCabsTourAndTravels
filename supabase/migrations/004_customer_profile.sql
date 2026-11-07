-- Customer profile: details collected at sign-up and editable under "My profile".
-- Same rule as before: RLS stays on with no policies, so only the server (service role) can read or write these.

alter table customers add column if not exists name       text not null default '' check (char_length(name) <= 80);
alter table customers add column if not exists phone      text not null default '' check (phone = '' or phone ~ '^[6-9][0-9]{9}$');
alter table customers add column if not exists city       text not null default '' check (char_length(city) <= 80);
alter table customers add column if not exists updated_at timestamptz not null default now();
