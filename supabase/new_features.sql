-- Gallery Images Table
create table if not exists public.gallery_images (
  id uuid default uuid_generate_v4() primary key,
  image_url text not null,
  alt_text text,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS
alter table public.gallery_images enable row level security;

-- Policies
create policy "Gallery is viewable by everyone" on public.gallery_images
  for select using (true);

create policy "Admins can manage gallery" on public.gallery_images
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
