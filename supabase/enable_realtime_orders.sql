-- Enable Realtime for the orders table
-- This allows clients to subscribe to changes (INSERT, UPDATE, DELETE)

-- 1. Ensure the table is part of the publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- 2. Verify Replica Identity (Optional but recommended for Full row updates if needed, though Default is usually fine for updates)
-- ALTER TABLE public.orders REPLICA IDENTITY FULL;
