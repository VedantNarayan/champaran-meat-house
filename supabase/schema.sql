-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Linked to Auth)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  role text check (role in ('customer', 'admin', 'driver')) default 'customer',
  full_name text,
  phone_number text,
  avatar_url text,
  updated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, phone_number)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    'customer',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. MENU MANAGEMENT
create table public.categories (
  id serial primary key,
  name text not null,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.menu_items (
  id uuid default uuid_generate_v4() primary key,
  category_id int references public.categories(id),
  name text not null,
  description text,
  price decimal(10,2) not null,
  image_url text,
  is_available boolean default true,
  is_veg boolean default true,
  variants jsonb, -- e.g. [{"size": "half", "price": 100}]
  tags text[], -- e.g. ['Veg', 'Spicy']
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2.5 BANNERS
create table public.banners (
  id uuid default uuid_generate_v4() primary key,
  image_url text not null,
  link text,
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. ORDERS
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id),
  status text check (status in ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')) default 'pending',
  total_amount decimal(10,2) not null,
  delivery_address jsonb, -- { street, city, lat, lng }
  driver_id uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id),
  quantity int not null,
  price_at_order decimal(10,2) not null,
  customizations jsonb -- e.g. { "Extra Cheese": true }
);

-- 4. ENABLE ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- POLICIES

-- Profiles: Users read/edit own, Admins read/edit all
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Menu: Readable by all, writable by Admin
create policy "Menu is viewable by everyone" on public.categories for select using (true);
create policy "Items are viewable by everyone" on public.menu_items for select using (true);

-- Orders: Users see own, Admins/Drivers see all
create policy "Users can view own orders" on public.orders
  for select using (auth.uid() = user_id);

create policy "Users can insert own orders" on public.orders
  for insert with check (auth.uid() = user_id);

create policy "Admins and Drivers can view all orders" on public.orders
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'driver'))
  );

create policy "Admins and Drivers can update orders" on public.orders
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'driver'))
  );
