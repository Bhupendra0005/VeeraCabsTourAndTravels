-- Per-IP throttling for login codes. Only a keyed hash of the IP is stored, never the address itself.
alter table login_otps add column if not exists ip_hash text;
create index if not exists login_otps_ip_created_idx on login_otps (ip_hash, created_at desc);
