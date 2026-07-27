-- PART 2 of 4 — run after Part 1 succeeds.
-- Functions + triggers. If this part is what fails, tell me the exact
-- error text — Supabase usually names the function/trigger in it.

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

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

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
