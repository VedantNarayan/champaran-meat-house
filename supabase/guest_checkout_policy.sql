-- Allow unauthenticated (guest) users to store contact info in jsonb, referencing no profile for now.
-- Policy to allow ANYONE to insert into orders / order_items
drop policy if exists "Users can insert own orders" on public.orders;

create policy "Allow Guest Inserts" on public.orders
for insert with check (true);

drop policy if exists "Users can insert own orders" on public.order_items; -- Wait, I likely relied on default or cascade?
-- Actually, order_items needs a policy too.
create policy "Allow Guest Item Inserts" on public.order_items
for insert with check (true);

-- Ensure user_id is nullable (it defaults to nullable but good to be safe)
alter table public.orders alter column user_id drop not null;
