-- Allow Admins to UPDATE any order
-- This fixes the issue where Admin status updates were being rejected by the database (RLS)
-- causing the UI to optimistically update but then revert.
drop policy if exists "Admins can update any order" on public.orders;
create policy "Admins can update any order" on public.orders
  for update using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Allow Admins to DELETE any order
drop policy if exists "Admins can delete any order" on public.orders;
create policy "Admins can delete any order" on public.orders
  for delete using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
