-- PART 3 of 4 — run after Part 2 succeeds.
-- Row Level Security + policies. If this part fails, tell me the exact
-- error text and, if visible, which policy name it mentions.

alter table public.profiles enable row level security;
alter table public.mandis enable row level security;
alter table public.crops enable row level security;
alter table public.crop_prices enable row level security;
alter table public.logistics_pools enable row level security;
alter table public.pool_bookings enable row level security;
alter table public.trader_listings enable row level security;
alter table public.shopkeeper_inventory enable row level security;
alter table public.verification_requests enable row level security;

create policy "read mandis" on public.mandis for select using (true);
create policy "read crops" on public.crops for select using (true);
create policy "read crop_prices" on public.crop_prices for select using (true);
create policy "read logistics_pools" on public.logistics_pools for select using (true);

create policy "profiles select own or admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles update own or admin" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

create policy "pool_bookings select own or admin" on public.pool_bookings
  for select using (auth.uid() = farmer_id or public.is_admin());
create policy "pool_bookings insert own" on public.pool_bookings
  for insert with check (auth.uid() = farmer_id);
create policy "pool_bookings update own or admin" on public.pool_bookings
  for update using (auth.uid() = farmer_id or public.is_admin());

create policy "trader_listings select all" on public.trader_listings
  for select using (true);
create policy "trader_listings insert own verified trader" on public.trader_listings
  for insert with check (
    auth.uid() = trader_id
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'trader' and verified = true)
  );
create policy "trader_listings update own or admin" on public.trader_listings
  for update using (auth.uid() = trader_id or public.is_admin());

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

create policy "verification select own or admin" on public.verification_requests
  for select using (auth.uid() = profile_id or public.is_admin());
create policy "verification insert own" on public.verification_requests
  for insert with check (auth.uid() = profile_id);
create policy "verification update admin only" on public.verification_requests
  for update using (public.is_admin());

create policy "mandis admin write" on public.mandis for all using (public.is_admin()) with check (public.is_admin());
create policy "crops admin write" on public.crops for all using (public.is_admin()) with check (public.is_admin());
create policy "crop_prices admin write" on public.crop_prices for all using (public.is_admin()) with check (public.is_admin());
create policy "logistics_pools admin write" on public.logistics_pools for all using (public.is_admin()) with check (public.is_admin());
