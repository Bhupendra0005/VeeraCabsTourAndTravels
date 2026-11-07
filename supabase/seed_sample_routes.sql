-- SAMPLE DATA ONLY. The fares below are placeholders (distance x a flat per-km rate)
-- so the booking flow can be tested. Replace them with Veera's real fixed fares
-- (Supabase > Table editor > routes / route_fares) BEFORE going live.

insert into routes (from_city, to_city, distance_km, duration_hours) values
  ('Pune', 'Mumbai', 150, 3.5),
  ('Mumbai', 'Pune', 150, 3.5),
  ('Pune', 'Shirdi', 185, 4.5),
  ('Shirdi', 'Pune', 185, 4.5),
  ('Pune', 'Nashik', 210, 4.5),
  ('Nashik', 'Pune', 210, 4.5),
  ('Pune', 'Mahabaleshwar', 120, 3.0),
  ('Mahabaleshwar', 'Pune', 120, 3.0),
  ('Pune', 'Lonavala', 65, 1.5),
  ('Lonavala', 'Pune', 65, 1.5),
  ('Pune', 'Goa', 450, 9.0),
  ('Goa', 'Pune', 450, 9.0)
on conflict (from_city, to_city) do nothing;

insert into route_fares (route_id, vehicle_type, fare_one_way)
select r.id, v.vehicle_type,
       (round(r.distance_km * v.per_km / 50.0) * 50 * 100)::int   -- rounded to nearest Rs 50, in paise
from routes r
cross join (values
  ('Sedan', 11),
  ('Premium SUV', 16),
  ('Spacious MPV', 15),
  ('Tempo Traveller', 24)
) as v(vehicle_type, per_km)
on conflict (route_id, vehicle_type) do nothing;
