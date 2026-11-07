
-- NEXTFIND DATABASE
-- Beheerder: rensheijkamp2007@gmail.com

-- 1. Productentabel
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null
    check (length(name) between 1 and 150),
  description text not null default '',
  category text not null default 'Overig',
  condition text not null default 'Gebruikt',
  price numeric(10,2) not null
    check (price >= 0),
  image_url text,
  available boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Beveiliging inschakelen
alter table public.products enable row level security;

-- Iedereen mag producten bekijken
create policy "Anyone can view products"
on public.products
for select to anon, authenticated
using (true);

-- Alleen jouw account mag producten toevoegen
create policy "Admin can insert"
on public.products
for insert to authenticated
with check (
  lower(auth.jwt()->>'email') =
  'rensheijkamp2007@gmail.com'
);

-- Alleen jouw account mag producten aanpassen
create policy "Admin can update"
on public.products
for update to authenticated
using (
  lower(auth.jwt()->>'email') =
  'rensheijkamp2007@gmail.com'
)
with check (
  lower(auth.jwt()->>'email') =
  'rensheijkamp2007@gmail.com'
);

-- Alleen jouw account mag producten verwijderen
create policy "Admin can delete"
on public.products
for delete to authenticated
using (
  lower(auth.jwt()->>'email') =
  'rensheijkamp2007@gmail.com'
);

-- 3. Foto-opslag
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do nothing;

-- Iedereen mag productfoto's bekijken
create policy "Public product photos"
on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'product-images'
);

-- Alleen jouw account mag foto's uploaden
create policy "Admin upload product photos"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'product-images'
  and lower(auth.jwt()->>'email') =
  'rensheijkamp2007@gmail.com'
);

-- Alleen jouw account mag foto's verwijderen
create policy "Admin delete product photos"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'product-images'
  and lower(auth.jwt()->>'email') =
  'rensheijkamp2007@gmail.com'
);
