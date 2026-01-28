-- Seed Categories
INSERT INTO public.categories (name, sort_order) VALUES
('Starters', 1),
('Main Course', 2),
('Breads', 3),
('Desserts', 4)
ON CONFLICT DO NOTHING;

-- Seed Menu Items
-- Note: We are using subqueries to get category_ids dynamically to avoid hardcoded ID mismatches
INSERT INTO public.menu_items (name, description, price, image_url, tags, category_id) VALUES
(
  'Champaran Mutton Handi', 
  'Slow-cooked mutton in a clay pot with whole spices and garlic bulbs.', 
  450, 
  'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60', 
  ARRAY['Spicy', 'Chef Special'], 
  (SELECT id FROM public.categories WHERE name = 'Starters' LIMIT 1)
),
(
  'Roasted Chicken Tikka', 
  'Juicy chicken chunks marinated in yogurt and spices, roasted to perfection.', 
  320, 
  'https://images.unsplash.com/photo-1599487488170-dad54fe2480f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60', 
  ARRAY['Starter'], 
  (SELECT id FROM public.categories WHERE name = 'Starters' LIMIT 1)
),
(
  'Ahuna Mutton Curry', 
  'Traditional Bihari style mutton curry cooked in mustard oil.', 
  480, 
  'https://images.unsplash.com/photo-1626777552726-4a6b5d29bf9d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60', 
  ARRAY['Gravy'], 
  (SELECT id FROM public.categories WHERE name = 'Main Course' LIMIT 1)
),
(
  'Butter Naan', 
  'Soft and fluffy leavened bread brushed with butter.', 
  60, 
  'https://images.unsplash.com/photo-1626074353765-517a681e40be?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60', 
  ARRAY['Veg'], 
  (SELECT id FROM public.categories WHERE name = 'Breads' LIMIT 1)
),
(
  'Gulab Jamun', 
  'Deep-fried milk solids soaked in rose-flavored sugar syrup.', 
  120, 
  'https://images.unsplash.com/photo-1593701461250-d71f2c2536c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60', 
  ARRAY['Sweet'], 
  (SELECT id FROM public.categories WHERE name = 'Desserts' LIMIT 1)
);
