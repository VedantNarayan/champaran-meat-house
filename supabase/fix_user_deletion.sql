-- Fix User Deletion Issues
-- The previous schema did not allow deleting users because 'orders' referenced 'profiles' restriction.
-- This script changes the behavior to SET NULL when a user is deleted, preserving the order data.

BEGIN;

-- 1. Fix Orders table constraints
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_user_id_fkey,
DROP CONSTRAINT IF EXISTS orders_driver_id_fkey;

ALTER TABLE public.orders
ADD CONSTRAINT orders_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.orders
ADD CONSTRAINT orders_driver_id_fkey
FOREIGN KEY (driver_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Fix Reviews table (if it exists from design_overhaul)
-- We check if the table exists first to avoid errors
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reviews') THEN
        ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;
        
        ALTER TABLE public.reviews 
        ADD CONSTRAINT reviews_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

COMMIT;
