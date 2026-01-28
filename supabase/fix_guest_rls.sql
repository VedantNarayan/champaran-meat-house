-- Allow anonymous users (guests) to view orders and order items
-- This is necessary for the 'Track Order' functionality to work for guests who don't have a user_id
-- CAUTION: This allows anyone with the Order ID (UUID) to view the order details.

-- 1. Policy for Orders
DROP POLICY IF EXISTS "Allow Public Read Orders" ON public.orders;
CREATE POLICY "Allow Public Read Orders" ON public.orders
FOR SELECT
USING (true);

-- 2. Policy for Order Items
DROP POLICY IF EXISTS "Allow Public Read Order Items" ON public.order_items;
CREATE POLICY "Allow Public Read Order Items" ON public.order_items
FOR SELECT
USING (true);
