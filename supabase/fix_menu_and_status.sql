-- 1. FIX MENU MANAGER (Enable Admins to Update/Insert/Delete)
-- We need to check if policies exist before creating to avoid errors, or just drop/create.
-- Dropping to be safe if they partially exist.

drop policy if exists "Admins can insert menu items" on public.menu_items;
drop policy if exists "Admins can update menu items" on public.menu_items;
drop policy if exists "Admins can delete menu items" on public.menu_items;

create policy "Admins can insert menu items" on public.menu_items
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update menu items" on public.menu_items
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete menu items" on public.menu_items
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 2. ADD 'READY' STATUS TO ORDERS
-- We need to drop the existing check constraint and add a new one.
-- constraint name is usually orders_status_check, but let's be safe.

alter table public.orders drop constraint if exists orders_status_check;

alter table public.orders add constraint orders_status_check 
  check (status in ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'));

-- 3. FIX DRIVER VIEW (Optional but good practice)
-- Ensure 'ready' orders are visible to drivers (already covered by "view all" policy for drivers, but helpful note)
