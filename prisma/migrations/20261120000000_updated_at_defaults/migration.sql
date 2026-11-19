-- Supabase Auth creates profiles through a database trigger rather than Prisma.
-- These defaults are required because trigger/raw SQL inserts do not receive
-- Prisma Client's @updatedAt value.
ALTER TABLE public.profiles
  ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE public.products
  ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE public.designs
  ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE public.orders
  ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
