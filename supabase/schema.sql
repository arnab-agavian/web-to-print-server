-- Digital Heroes web-to-print schema
-- Run in a fresh Supabase SQL editor. All customer-owned tables are protected by RLS.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  company_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  family text not null check (family in ('labels','race_numbers','mtb_boards','stamps','trophies','laser_cut')),
  description text,
  base_price numeric(12,2) not null check (base_price > 0),
  min_quantity integer not null default 1 check (min_quantity > 0),
  min_width numeric(10,2) not null check (min_width > 0),
  max_width numeric(10,2) not null check (max_width >= min_width),
  min_height numeric(10,2) not null check (min_height > 0),
  max_height numeric(10,2) not null check (max_height >= min_height),
  default_width numeric(10,2) not null,
  default_height numeric(10,2) not null,
  bleed_mm numeric(6,2) not null default 3,
  resolution_dpi integer not null default 300,
  configuration_schema jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default 'Home',
  recipient_name text not null,
  phone text not null,
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  country_code char(2) not null default 'IN' check (country_code ~ '^[A-Z]{2}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  width_mm numeric(10,2) not null check (width_mm > 0),
  height_mm numeric(10,2) not null check (height_mm > 0),
  material text not null,
  material_multiplier numeric(6,3) not null default 1 check (material_multiplier between 0.5 and 3),
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  canvas_width numeric(10,2) not null,
  canvas_height numeric(10,2) not null,
  safe_area jsonb not null,
  placeholder_rules jsonb not null default '{}'::jsonb,
  thumbnail_path text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.designs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  template_id uuid references public.templates(id) on delete set null,
  name text not null,
  design_data jsonb not null default '{}'::jsonb,
  preview_path text,
  source_file_path text,
  status text not null default 'draft' check (status in ('draft','ready','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null constraint orders_customer_id_fkey references public.profiles(id) on delete restrict,
  status text not null default 'quote' check (status in ('quote','order','artwork','proof','production','completed','cancelled')),
  proof_status text not null default 'not_started' check (proof_status in ('not_started','awaiting_approval','changes_requested','approved')),
  production_ready boolean not null default false,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  tax numeric(12,2) not null default 0 check (tax >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  currency text not null default 'INR',
  configuration jsonb not null default '{}'::jsonb,
  payment_reference text,
  invoice_path text,
  reordered_from uuid references public.orders(id) on delete set null,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  design_id uuid references public.designs(id) on delete set null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  width_mm numeric(10,2) not null check (width_mm > 0),
  height_mm numeric(10,2) not null check (height_mm > 0),
  material text not null,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null default 'pending' check (status in ('pending','approved','changes_requested','superseded')),
  preview_path text not null,
  notes text,
  change_request text,
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique(order_id, version)
);

create table if not exists public.production_files (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  proof_id uuid not null references public.proofs(id) on delete restrict,
  kind text not null check (kind in ('pdf','png','csv_merge','source')),
  storage_path text not null,
  file_name text not null,
  size_bytes bigint check (size_bytes >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Foreign keys are not automatically indexed in Postgres.
create index if not exists templates_product_id_idx on public.templates(product_id);
create index if not exists addresses_customer_id_updated_idx on public.addresses(customer_id,updated_at desc);
create unique index if not exists addresses_one_default_per_customer_idx on public.addresses(customer_id) where is_default;
create index if not exists cart_items_cart_id_idx on public.cart_items(cart_id);
create index if not exists cart_items_product_id_idx on public.cart_items(product_id);
create index if not exists designs_customer_id_updated_idx on public.designs(customer_id, updated_at desc);
create index if not exists designs_product_id_idx on public.designs(product_id);
create index if not exists orders_customer_id_created_idx on public.orders(customer_id, created_at desc);
create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists orders_due_active_idx on public.orders(due_at) where status not in ('completed','cancelled');
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_product_id_idx on public.order_items(product_id);
create index if not exists order_items_design_id_idx on public.order_items(design_id);
create index if not exists proofs_order_id_created_idx on public.proofs(order_id, created_at desc);
create index if not exists proofs_created_by_idx on public.proofs(created_by);
create index if not exists proofs_approved_by_idx on public.proofs(approved_by);
create index if not exists production_files_order_id_idx on public.production_files(order_id);
create index if not exists production_files_proof_id_idx on public.production_files(proof_id);
create index if not exists order_events_order_id_created_idx on public.order_events(order_id, created_at desc);
create index if not exists order_events_actor_id_idx on public.order_events(actor_id);
create index if not exists products_configuration_gin_idx on public.products using gin(configuration_schema);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
drop trigger if exists addresses_set_updated_at on public.addresses;
create trigger addresses_set_updated_at before update on public.addresses for each row execute function public.set_updated_at();
drop trigger if exists carts_set_updated_at on public.carts;
create trigger carts_set_updated_at before update on public.carts for each row execute function public.set_updated_at();
drop trigger if exists cart_items_set_updated_at on public.cart_items;
create trigger cart_items_set_updated_at before update on public.cart_items for each row execute function public.set_updated_at();
drop trigger if exists designs_set_updated_at on public.designs;
create trigger designs_set_updated_at before update on public.designs for each row execute function public.set_updated_at();
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,email,full_name,phone,role)
  values(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    nullif(new.raw_user_meta_data->>'phone',''),
    'customer'
  );
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin');
$$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.addresses enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.templates enable row level security;
alter table public.designs enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.proofs enable row level security;
alter table public.production_files enable row level security;
alter table public.order_events enable row level security;

drop policy if exists profiles_own_read on public.profiles;
create policy profiles_own_read on public.profiles for select to authenticated using ((select auth.uid())=id or (select public.is_admin()));
drop policy if exists profiles_own_update on public.profiles;
create policy profiles_own_update on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id and role='customer');
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select to anon,authenticated using (active=true);
drop policy if exists addresses_customer_all on public.addresses;
create policy addresses_customer_all on public.addresses for all to authenticated
using ((select auth.uid())=customer_id)
with check ((select auth.uid())=customer_id);
drop policy if exists carts_customer_all on public.carts;
create policy carts_customer_all on public.carts for all to authenticated
using ((select auth.uid())=customer_id)
with check ((select auth.uid())=customer_id);
drop policy if exists cart_items_customer_all on public.cart_items;
create policy cart_items_customer_all on public.cart_items for all to authenticated
using (exists(select 1 from public.carts c where c.id=cart_id and c.customer_id=(select auth.uid())))
with check (exists(select 1 from public.carts c where c.id=cart_id and c.customer_id=(select auth.uid())));
drop policy if exists templates_public_read on public.templates;
create policy templates_public_read on public.templates for select to anon,authenticated using (active=true);
drop policy if exists designs_customer_all on public.designs;
create policy designs_customer_all on public.designs for all to authenticated using ((select auth.uid())=customer_id or (select public.is_admin())) with check ((select auth.uid())=customer_id or (select public.is_admin()));
drop policy if exists orders_customer_read on public.orders;
create policy orders_customer_read on public.orders for select to authenticated using ((select auth.uid())=customer_id or (select public.is_admin()));
drop policy if exists order_items_customer_read on public.order_items;
create policy order_items_customer_read on public.order_items for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and (o.customer_id=(select auth.uid()) or (select public.is_admin()))));
drop policy if exists proofs_customer_read on public.proofs;
create policy proofs_customer_read on public.proofs for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and (o.customer_id=(select auth.uid()) or (select public.is_admin()))));
drop policy if exists production_files_admin_read on public.production_files;
create policy production_files_admin_read on public.production_files for select to authenticated using ((select public.is_admin()));
drop policy if exists order_events_customer_read on public.order_events;
create policy order_events_customer_read on public.order_events for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and (o.customer_id=(select auth.uid()) or (select public.is_admin()))));

-- Called only by the trusted Express service-role client.
create or replace function public.admin_dashboard_metrics() returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'orders', count(*),
    'revenue', coalesce(sum(total) filter (where status <> 'cancelled'),0),
    'awaitingProof', count(*) filter (where proof_status='awaiting_approval'),
    'inProduction', count(*) filter (where status='production'),
    'completed', count(*) filter (where status='completed')
  ) from public.orders where created_at >= date_trunc('month',now());
$$;
revoke all on function public.admin_dashboard_metrics() from public,anon,authenticated;
grant execute on function public.admin_dashboard_metrics() to service_role;

-- Private buckets keep originals and production output out of public URLs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('artwork','artwork',false,52428800,array['application/pdf','image/png','image/svg+xml','application/postscript']),
       ('proofs','proofs',false,52428800,array['application/pdf','image/png']),
       ('production','production',false,209715200,array['application/pdf','image/png','text/csv']),
       ('uploads','uploads',false,10485760,array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict(id) do nothing;

drop policy if exists artwork_owner_objects on storage.objects;
create policy artwork_owner_objects on storage.objects for all to authenticated
using (bucket_id='artwork' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='artwork' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists proofs_authenticated_read on storage.objects;
create policy proofs_authenticated_read on storage.objects for select to authenticated using (bucket_id='proofs');
drop policy if exists uploads_owner_objects on storage.objects;
create policy uploads_owner_objects on storage.objects for all to authenticated
using (bucket_id='uploads' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='uploads' and (storage.foldername(name))[1]=(select auth.uid())::text);

