-- Create user_addresses table
create table user_addresses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  full_name text not null,
  phone_number text not null,
  street text not null,
  city text not null,
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table user_addresses enable row level security;

-- Policies
create policy "Users can view their own addresses"
  on user_addresses for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own addresses"
  on user_addresses for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own addresses"
  on user_addresses for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own addresses"
  on user_addresses for delete
  using ( auth.uid() = user_id );
