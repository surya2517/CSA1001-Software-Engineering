-- =====================================================================
-- MandiFlow — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run: uses "if not exists" / "or replace" where possible.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PROFILES (one row per auth.users row, holds role + verification)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  mobile text,
  role text not null check (role in ('user','farmer','shopkeeper','trader','admin')) default 'user',
  state text,
  district text,
  shop_address text,
  license_number text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- New auth users automatically get a profile row, using metadata
-- passed at signUp({ options: { data: { full_name, role, mobile }}})
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, mobile, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    new.raw_user_meta_data->>'mobile',
    coalesce(new.raw_user_meta_data->>'role', 'user')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2. MANDIS (markets) & CROPS (reference data)
-- ---------------------------------------------------------------------
create table if not exists public.mandis (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  district text,
  state text
);

create table if not exists public.crops (
  id text primary key,               -- e.g. 'tomato'
  name text not null,
  category text check (category in ('vegetable','fruit','grain','spice')),
  emoji text
);

-- ---------------------------------------------------------------------
-- 3. CROP PRICES (daily mandi price records, what the ticker/search reads)
-- ---------------------------------------------------------------------
create table if not exists public.crop_prices (
  id uuid primary key default gen_random_uuid(),
  crop_id text references public.crops(id) on delete cascade,
  mandi_id uuid references public.mandis(id) on delete cascade,
  grade_a numeric,
  grade_b numeric,
  arrivals_tons numeric,
  price_date date not null default current_date,
  trend numeric[] default '{}',      -- last 7 days, for the chart
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. LOGISTICS POOLS (shared reefer trucks) & bookings (farmer joins)
-- ---------------------------------------------------------------------
create table if not exists public.logistics_pools (
  id uuid primary key default gen_random_uuid(),
  vehicle_number text not null,
  route_from text,
  route_to text,
  capacity_tons numeric not null,
  filled_tons numeric not null default 0,
  departure_time timestamptz,
  floor_price numeric,
  status text check (status in ('open','full','departed')) default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.pool_bookings (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid references public.logistics_pools(id) on delete cascade,
  farmer_id uuid references public.profiles(id) on delete cascade,
  weight_tons numeric not null,
  locked_price numeric,
  escrow_status text check (escrow_status in ('none','locked','released')) default 'none',
  created_at timestamptz not null default now()
);

-- Keep filled_tons in sync whenever a booking is added
create or replace function public.after_pool_booking_insert()
returns trigger as $$
begin
  update public.logistics_pools
    set filled_tons = filled_tons + new.weight_tons,
        status = case when filled_tons + new.weight_tons >= capacity_tons then 'full' else status end
    where id = new.pool_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_pool_booking_insert on public.pool_bookings;
create trigger on_pool_booking_insert
  after insert on public.pool_bookings
  for each row execute procedure public.after_pool_booking_insert();

-- ---------------------------------------------------------------------
-- 5. TRADER LISTINGS & ESCROW (B2B desk)
-- ---------------------------------------------------------------------
create table if not exists public.trader_listings (
  id uuid primary key default gen_random_uuid(),
  trader_id uuid references public.profiles(id) on delete cascade,
  crop_id text references public.crops(id),
  batch_name text not null,
  quantity_kg numeric,
  price_per_kg numeric,
  escrow_amount numeric default 0,
  escrow_status text check (escrow_status in ('none','locked','released')) default 'none',
  moisture_verified boolean default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. SHOPKEEPER INVENTORY
-- ---------------------------------------------------------------------
create table if not exists public.shopkeeper_inventory (
  id uuid primary key default gen_random_uuid(),
  shopkeeper_id uuid references public.profiles(id) on delete cascade,
  crop_id text references public.crops(id),
  wholesale_rate numeric,
  retail_rate numeric,
  stock_kg numeric,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 7. VERIFICATION REQUESTS (admin approves shopkeepers/traders)
-- ---------------------------------------------------------------------
create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  status text check (status in ('pending','approved','rejected')) default 'pending',
  note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.mandis enable row level security;
alter table public.crops enable row level security;
alter table public.crop_prices enable row level security;
alter table public.logistics_pools enable row level security;
alter table public.pool_bookings enable row level security;
alter table public.trader_listings enable row level security;
alter table public.shopkeeper_inventory enable row level security;
alter table public.verification_requests enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- Public reference data: anyone (even logged out) can read
create policy "read mandis" on public.mandis for select using (true);
create policy "read crops" on public.crops for select using (true);
create policy "read crop_prices" on public.crop_prices for select using (true);
create policy "read logistics_pools" on public.logistics_pools for select using (true);

-- Profiles: user reads/updates own row; admin reads/updates all
create policy "profiles select own or admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles update own or admin" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

-- Pool bookings: farmer manages own bookings; everyone can see aggregate pool fill via logistics_pools select above
create policy "pool_bookings select own or admin" on public.pool_bookings
  for select using (auth.uid() = farmer_id or public.is_admin());
create policy "pool_bookings insert own" on public.pool_bookings
  for insert with check (auth.uid() = farmer_id);
create policy "pool_bookings update own or admin" on public.pool_bookings
  for update using (auth.uid() = farmer_id or public.is_admin());

-- Trader listings: any signed-in user can browse; only the owning trader (once verified) can write
create policy "trader_listings select all" on public.trader_listings
  for select using (true);
create policy "trader_listings insert own verified trader" on public.trader_listings
  for insert with check (
    auth.uid() = trader_id
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'trader' and verified = true)
  );
create policy "trader_listings update own or admin" on public.trader_listings
  for update using (auth.uid() = trader_id or public.is_admin());

-- Shopkeeper inventory: public can browse; only owning verified shopkeeper can write
create policy "shopkeeper_inventory select all" on public.shopkeeper_inventory
  for select using (true);
create policy "shopkeeper_inventory insert own verified shopkeeper" on public.shopkeeper_inventory
  for insert with check (
    auth.uid() = shopkeeper_id
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'shopkeeper' and verified = true)
  );
create policy "shopkeeper_inventory update own or admin" on public.shopkeeper_inventory
  for update using (auth.uid() = shopkeeper_id or public.is_admin());
create policy "shopkeeper_inventory delete own or admin" on public.shopkeeper_inventory
  for delete using (auth.uid() = shopkeeper_id or public.is_admin());

-- Verification requests: applicant can create/read own; only admin can update (approve/reject)
create policy "verification select own or admin" on public.verification_requests
  for select using (auth.uid() = profile_id or public.is_admin());
create policy "verification insert own" on public.verification_requests
  for insert with check (auth.uid() = profile_id);
create policy "verification update admin only" on public.verification_requests
  for update using (public.is_admin());

-- When admin approves a verification_request, flip profiles.verified
create or replace function public.after_verification_update()
returns trigger as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    update public.profiles set verified = true where id = new.profile_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_verification_update on public.verification_requests;
create trigger on_verification_update
  after update on public.verification_requests
  for each row execute procedure public.after_verification_update();

-- Admin write access to mandi/crop/price reference data + pools
create policy "mandis admin write" on public.mandis for all using (public.is_admin()) with check (public.is_admin());
create policy "crops admin write" on public.crops for all using (public.is_admin()) with check (public.is_admin());
create policy "crop_prices admin write" on public.crop_prices for all using (public.is_admin()) with check (public.is_admin());
create policy "logistics_pools admin write" on public.logistics_pools for all using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- SEED DATA (mirrors the original mockup so the app isn't empty on first run)
-- =====================================================================
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

-- Sample price rows (looked up by mandi name so this works regardless of generated uuids)
insert into public.crop_prices (crop_id, mandi_id, grade_a, grade_b, arrivals_tons, trend)
select 'tomato', id, 26, 20, 180, array[14,13,12,16,22,26,25] from public.mandis where name = 'Mumbai Vashi APMC'
union all
select 'onion', id, 39, 33, 420, array[28,29,31,32,35,38,39] from public.mandis where name = 'Pune Gultekdi Mandi'
union all
select 'chili', id, 68, 55, 95, array[42,45,48,52,60,65,68] from public.mandis where name = 'Hyderabad Bowenpally'
union all
select 'potato', id, 27, 22, 560, array[16,17,18,20,23,25,27] from public.mandis where name = 'Delhi Azadpur APMC'
union all
select 'wheat', id, 26.5, 24, 300, array[22,23,24,25,25.5,26,26.5] from public.mandis where name = 'Karnal Grain Mandi'
on conflict do nothing;

