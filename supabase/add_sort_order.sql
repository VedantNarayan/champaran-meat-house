-- Add sort_order column to menu_items for reordering
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0;

-- Update existing items to have a sort order based on creation time (optional, but good for initial state)
WITH sorted_items AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.menu_items
)
UPDATE public.menu_items
SET sort_order = sorted_items.rn

FROM sorted_items
WHERE public.menu_items.id = sorted_items.id;

-- Create settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamp with time zone default now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow admins to view/edit settings
CREATE POLICY "Admins can manage settings" ON public.app_settings
  USING (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  WITH CHECK (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));


