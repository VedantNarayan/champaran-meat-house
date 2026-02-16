
-- Add is_deleted column for soft deletes
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- Policy to hide deleted items from public view
-- Note: We might need to adjust existing policies or just filter in the query.
-- For now, we will rely on frontend filtering and backend query adjustments.
