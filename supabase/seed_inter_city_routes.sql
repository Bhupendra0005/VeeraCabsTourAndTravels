-- INTER-CITY SAMPLE ROUTES (both directions), so a customer can pick e.g. Solapur -> Kolhapur, not only X -> Pune.
-- SAMPLE DATA ONLY, like seed_sample_routes.sql and seed_more_routes.sql.
--
-- * Distances and drive times are rough road estimates. Check them before going live.
-- * Fares are PLACEHOLDERS (distance x a flat per-km rate, rounded to Rs 50), only so the booking flow can be tested.
--   Replace them with Veera's real fixed fares (Admin > Routes & fares) BEFORE taking real bookings, or switch the
--   route off there.
-- * Safe to run more than once: a route that already exists is left alone (and its fares are not touched).
--
-- Each pair is written once below; the reverse direction is added automatically.

with pairs (city_a, city_b, distance_km, duration_hours) as (
  values
    ('Solapur', 'Kolhapur', 240, 4.5),
    ('Solapur', 'Pandharpur', 75, 1.5),
    ('Solapur', 'Aurangabad', 270, 5.5),
    ('Solapur', 'Mumbai', 400, 7.5),
    ('Solapur', 'Sangli', 170, 3.5),
    ('Solapur', 'Satara', 200, 4.0),
    ('Kolhapur', 'Mumbai', 380, 8.0),
    ('Kolhapur', 'Goa', 220, 5.5),
    ('Kolhapur', 'Sangli', 50, 1.2),
    ('Kolhapur', 'Satara', 130, 2.5),
    ('Kolhapur', 'Pandharpur', 210, 4.5),
    ('Kolhapur', 'Ganpatipule', 150, 4.0),
    ('Mumbai', 'Nashik', 170, 3.5),
    ('Mumbai', 'Shirdi', 240, 5.5),
    ('Mumbai', 'Lonavala', 85, 2.0),
    ('Mumbai', 'Alibaug', 100, 2.5),
    ('Mumbai', 'Mahabaleshwar', 260, 6.0),
    ('Mumbai', 'Goa', 590, 11.0),
    ('Mumbai', 'Ganpatipule', 340, 7.0),
    ('Mumbai', 'Aurangabad', 335, 6.5),
    ('Nashik', 'Shirdi', 90, 2.0),
    ('Nashik', 'Aurangabad', 190, 4.0),
    ('Shirdi', 'Aurangabad', 140, 3.0),
    ('Shirdi', 'Ahmednagar', 85, 1.5),
    ('Ahmednagar', 'Aurangabad', 115, 2.5),
    ('Satara', 'Mahabaleshwar', 60, 1.5),
    ('Satara', 'Panchgani', 45, 1.2),
    ('Satara', 'Sangli', 120, 2.5),
    ('Panchgani', 'Mahabaleshwar', 20, 0.5),
    ('Pandharpur', 'Satara', 150, 3.5),
    ('Pandharpur', 'Sangli', 130, 3.0),
    ('Goa', 'Ganpatipule', 270, 6.0)
),
both_ways as (
  select city_a as from_city, city_b as to_city, distance_km, duration_hours from pairs
  union all
  select city_b, city_a, distance_km, duration_hours from pairs
),
added as (
  insert into routes (from_city, to_city, distance_km, duration_hours)
  select from_city, to_city, distance_km, duration_hours from both_ways
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
