-- Allow anyone to create an order (Guest checkout support)
-- This allows both anonymous and authenticated users to insert new orders.

-- 1. Policy for Orders (INSERT)
DROP POLICY IF EXISTS "Allow Public Insert Orders" ON public.orders;
CREATE POLICY "Allow Public Insert Orders" ON public.orders
FOR INSERT
WITH CHECK (true); 

-- 2. Policy for Order Items (INSERT)
DROP POLICY IF EXISTS "Allow Public Insert Order Items" ON public.order_items;
CREATE POLICY "Allow Public Insert Order Items" ON public.order_items
FOR INSERT
WITH CHECK (true);

-- 3. Policy for Orders (SELECT) - Update existing to ensure it covers created_at for users
-- (Already handled in fix_guest_rls.sql but good to double check or reinforce if needed)
-- We'll rely on fix_guest_rls.sql for SELECT permissions for now.
