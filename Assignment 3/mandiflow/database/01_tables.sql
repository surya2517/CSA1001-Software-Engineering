-- PART 1 of 4 — run this alone first, then tell me if it succeeds.
-- Just table definitions, nothing clever, to rule out a basic issue.

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

create table if not exists public.mandis (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  district text,
  state text
);

create table if not exists public.crops (
  id text primary key,
  name text not null,
  category text check (category in ('vegetable','fruit','grain','spice')),
  emoji text
);

create table if not exists public.crop_prices (
  id uuid primary key default gen_random_uuid(),
  crop_id text references public.crops(id) on delete cascade,
  mandi_id uuid references public.mandis(id) on delete cascade,
  grade_a numeric,
  grade_b numeric,
  arrivals_tons numeric,
  price_date date not null default current_date,
  trend numeric[] default '{}',
  created_at timestamptz not null default now()
);

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

create table if not exists public.shopkeeper_inventory (
  id uuid primary key default gen_random_uuid(),
  shopkeeper_id uuid references public.profiles(id) on delete cascade,
  crop_id text references public.crops(id),
  wholesale_rate numeric,
  retail_rate numeric,
  stock_kg numeric,
  updated_at timestamptz not null default now()
);

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  status text check (status in ('pending','approved','rejected')) default 'pending',
  note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
