-- MORE SAMPLE ROUTES (both directions). SAMPLE DATA ONLY, like seed_sample_routes.sql.
--
-- * The distances and drive times are rough road estimates. Check them before going live.
-- * The fares are PLACEHOLDERS (distance x a flat per-km rate, rounded to Rs 50), only so the booking flow can be
--   tested. Replace them with Veera's real fixed fares (Admin > Routes & fares) BEFORE taking real bookings,
--   or switch the route off there.
-- * Safe to run more than once: a route that already exists is left alone (and its fares are not touched).
--
-- Run it in Supabase > SQL editor.

with new_routes (from_city, to_city, distance_km, duration_hours) as (
  values
    ('Pune', 'Kolhapur', 230, 5.0),
    ('Kolhapur', 'Pune', 230, 5.0),
    ('Pune', 'Pandharpur', 205, 4.5),
    ('Pandharpur', 'Pune', 205, 4.5),
    ('Pune', 'Alibaug', 145, 3.5),
    ('Alibaug', 'Pune', 145, 3.5),
    ('Pune', 'Satara', 110, 2.0),
    ('Satara', 'Pune', 110, 2.0),
    ('Pune', 'Sangli', 230, 4.5),
    ('Sangli', 'Pune', 230, 4.5),
    ('Pune', 'Aurangabad', 235, 5.0),
    ('Aurangabad', 'Pune', 235, 5.0),
    ('Pune', 'Ahmednagar', 120, 2.5),
    ('Ahmednagar', 'Pune', 120, 2.5),
    ('Pune', 'Panchgani', 100, 2.5),
    ('Panchgani', 'Pune', 100, 2.5),
    ('Pune', 'Solapur', 250, 4.5),
    ('Solapur', 'Pune', 250, 4.5),
    ('Pune', 'Bhimashankar', 110, 3.0),
    ('Bhimashankar', 'Pune', 110, 3.0),
    ('Pune', 'Ganpatipule', 330, 7.0),
    ('Ganpatipule', 'Pune', 330, 7.0)
),
added as (
  insert into routes (from_city, to_city, distance_km, duration_hours)
  select from_city, to_city, distance_km, duration_hours from new_routes
  on conflict (from_city, to_city) do nothing
  returning id, distance_km
)
-- fares are made only for the routes added just now (amounts are in paise)
insert into route_fares (route_id, vehicle_type, fare_one_way)
select a.id, v.vehicle_type, (round(a.distance_km * v.per_km / 50.0) * 50 * 100)::int
from added a
cross join (values
  ('Sedan', 11),
  ('Premium SUV', 16),
  ('Spacious MPV', 15),
  ('Tempo Traveller', 24)
) as v(vehicle_type, per_km)
on conflict (route_id, vehicle_type) do nothing;
