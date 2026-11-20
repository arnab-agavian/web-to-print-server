-- Persistent customer carts with owner-only access.
CREATE TABLE public.carts (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT carts_pkey PRIMARY KEY (id),
  CONSTRAINT carts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  width_mm DECIMAL(10,2) NOT NULL,
  height_mm DECIMAL(10,2) NOT NULL,
  material TEXT NOT NULL,
  material_multiplier DECIMAL(6,3) NOT NULL DEFAULT 1,
  configuration JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT cart_items_pkey PRIMARY KEY (id),
  CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT cart_items_values_check CHECK (
    quantity > 0 AND width_mm > 0 AND height_mm > 0 AND material_multiplier BETWEEN 0.5 AND 3
  )
);

CREATE UNIQUE INDEX carts_customer_id_key ON public.carts(customer_id);
CREATE INDEX cart_items_cart_id_idx ON public.cart_items(cart_id);
CREATE INDEX cart_items_product_id_idx ON public.cart_items(product_id);

-- Prisma migrations must define this dependency themselves; running
-- supabase/schema.sql separately is not required for a clean deployment.
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER carts_set_updated_at
BEFORE UPDATE ON public.carts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER cart_items_set_updated_at
BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY carts_customer_all ON public.carts FOR ALL TO authenticated
USING ((SELECT auth.uid()) = customer_id)
WITH CHECK ((SELECT auth.uid()) = customer_id);

CREATE POLICY cart_items_customer_all ON public.cart_items FOR ALL TO authenticated
USING (EXISTS(
  SELECT 1 FROM public.carts c
  WHERE c.id = cart_id AND c.customer_id = (SELECT auth.uid())
))
WITH CHECK (EXISTS(
  SELECT 1 FROM public.carts c
  WHERE c.id = cart_id AND c.customer_id = (SELECT auth.uid())
));
