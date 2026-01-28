-- Seed Data for Design Overhaul
-- Run this in your Supabase SQL Editor to populate the site with sample data.

-- 1. Insert Sample Banners
INSERT INTO public.banners (image_url, title, link, is_active, sort_order)
VALUES 
    ('https://images.unsplash.com/photo-1544025162-d76690b609aa?q=80&w=1974&auto=format&fit=crop', 'Authentic Ahuna Mutton', '/menu', true, 1),
    ('https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1974&auto=format&fit=crop', 'Special Weekend Offer', '/menu', true, 2),
    ('https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1974&auto=format&fit=crop', 'Fresh Ingredients Daily', '/about', true, 3);

-- 2. Update existing Menu Items with Variants and Images 
-- (Assuming standard Ahuna Mutton types. If names don't match, these updates might skip, which is fine.)

-- Update "Ahuna Mutton Handi" (or similar)
UPDATE public.menu_items
SET 
    variants = '[
        {"size": "250g", "price": 350},
        {"size": "500g", "price": 650},
        {"size": "1kg", "price": 1200}
    ]'::jsonb,
    images = ARRAY[
        'https://images.unsplash.com/photo-1544025162-d76690b609aa?q=80&w=800',
        'https://images.unsplash.com/photo-1626804475297-411dbe923c6d?q=80&w=800'
    ],
    is_veg = false
WHERE name ILIKE '%mutton%';

-- Update "Champaran Chicken" (or similar)
UPDATE public.menu_items
SET 
    variants = '[
        {"size": "Half", "price": 400},
        {"size": "Full", "price": 750}
    ]'::jsonb,
    images = ARRAY[
        'https://images.unsplash.com/photo-1626804475315-b2j3k4j1k2l3?q=80&w=800', -- Placeholder valid URL needed really
        'https://images.unsplash.com/photo-1606728035753-30da835128ce?q=80&w=800'
    ],
    is_veg = false
WHERE name ILIKE '%chicken%';

-- Update Rice/Breads (Veg items)
UPDATE public.menu_items
SET 
    variants = '[
        {"size": "Plate", "price": 120}
    ]'::jsonb,
    images = ARRAY['https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800'],
    is_veg = true
WHERE name ILIKE '%paneer%' OR name ILIKE '%veg%';

-- Update Rice specifically
UPDATE public.menu_items
SET 
    variants = '[
        {"size": "Half", "price": 60},
        {"size": "Full", "price": 100}
    ]'::jsonb,
    is_veg = true
WHERE name ILIKE '%rice%';
