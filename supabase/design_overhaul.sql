-- Design & Feature Overhaul Migration Script

-- 1. Update MENU_ITEMS table
-- Add 'variants' for weight-based pricing (e.g., [{"size": "250g", "price": 300}, ...])
-- Add 'images' for the slider (array of URLs)
-- Add 'is_veg' for filtering
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS is_veg BOOLEAN DEFAULT TRUE;

-- 2. Create REVIEWS table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policies for reviews
-- Everyone can read reviews
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews
    FOR SELECT USING (true);

-- Authenticated users can create reviews
CREATE POLICY "Authenticated users can create reviews" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reviews (optional)
CREATE POLICY "Users can delete own reviews" ON public.reviews
    FOR DELETE USING (auth.uid() = user_id);


-- 3. Create BANNERS table
CREATE TABLE IF NOT EXISTS public.banners (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    image_url TEXT NOT NULL,
    title TEXT,
    link TEXT, -- Optional link to a specific category or item
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for banners
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Policies for banners
-- Everyone can read active banners
CREATE POLICY "Banners are viewable by everyone" ON public.banners
    FOR SELECT USING (true);

-- Only admins can manage banners
CREATE POLICY "Admins can manage banners" ON public.banners
    FOR ALL USING (
        exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    );
