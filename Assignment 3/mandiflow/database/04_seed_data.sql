-- PART 4 of 4 — run after Part 3 succeeds. Sample data only.

insert into public.crops (id, name, category, emoji) values
  ('tomato', 'Tomato (टमाटर)', 'vegetable', '🍅'),
  ('onion', 'Onion (प्याज)', 'vegetable', '🧅'),
  ('chili', 'Green Chili (हरी मिर्च)', 'spice', '🌶️'),
  ('potato', 'Potato (आलू)', 'vegetable', '🥔'),
  ('wheat', 'Wheat (गेहूं)', 'grain', '🌾')
on conflict (id) do nothing;

insert into public.mandis (name, district, state) values
  ('Pimpalgaon Mandi', 'Nashik', 'MH'),
  ('Mumbai Vashi APMC', 'Mumbai', 'MH'),
  ('Lasalgaon Mandi', 'Nashik', 'MH'),
  ('Pune Gultekdi Mandi', 'Pune', 'MH'),
  ('Guntur Rural Mandi', 'Guntur', 'AP'),
  ('Hyderabad Bowenpally', 'Hyderabad', 'TS'),
  ('Agra Mandi', 'Agra', 'UP'),
  ('Delhi Azadpur APMC', 'Delhi', 'DL'),
  ('Karnal Grain Mandi', 'Karnal', 'PB')
on conflict do nothing;

insert into public.logistics_pools (vehicle_number, route_from, route_to, capacity_tons, filled_tons, departure_time, floor_price, status)
values ('MH-15-EG-4421', 'Pimpalgaon Cluster', 'Mumbai Vashi APMC', 4.5, 3.2, now() + interval '4 hours', 26, 'open')
on conflict do nothing;

insert into public.crop_prices (crop_id, mandi_id, grade_a, grade_b, arrivals_tons, trend)
select 'tomato', id, 26, 20, 180, array[14,13,12,16,22,26,25]::numeric[] from public.mandis where name = 'Mumbai Vashi APMC'
union all
select 'onion', id, 39, 33, 420, array[28,29,31,32,35,38,39]::numeric[] from public.mandis where name = 'Pune Gultekdi Mandi'
union all
select 'chili', id, 68, 55, 95, array[42,45,48,52,60,65,68]::numeric[] from public.mandis where name = 'Hyderabad Bowenpally'
union all
select 'potato', id, 27, 22, 560, array[16,17,18,20,23,25,27]::numeric[] from public.mandis where name = 'Delhi Azadpur APMC'
union all
select 'wheat', id, 26.5, 24, 300, array[22,23,24,25,25.5,26,26.5]::numeric[] from public.mandis where name = 'Karnal Grain Mandi'
on conflict do nothing;
