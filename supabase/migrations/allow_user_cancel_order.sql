-- Allow users to update their own orders (e.g. to Cancel)
create policy "Users can update own orders" on public.orders
  for update using (auth.uid() = user_id);
