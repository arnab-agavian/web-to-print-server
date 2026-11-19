-- Supabase-specific integrity, Auth, RLS and Storage additions.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('customer','admin'));

ALTER TABLE public.products
  ADD CONSTRAINT products_family_check CHECK (family IN ('labels','race_numbers','mtb_boards','stamps','trophies','laser_cut')),
  ADD CONSTRAINT products_base_price_check CHECK (base_price > 0),
  ADD CONSTRAINT products_min_quantity_check CHECK (min_quantity > 0),
  ADD CONSTRAINT products_width_check CHECK (min_width > 0 AND max_width >= min_width),
  ADD CONSTRAINT products_height_check CHECK (min_height > 0 AND max_height >= min_height);

ALTER TABLE public.designs
  ADD CONSTRAINT designs_status_check CHECK (status IN ('draft','ready','archived'));

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check CHECK (status IN ('quote','order','artwork','proof','production','completed','cancelled')),
  ADD CONSTRAINT orders_proof_status_check CHECK (proof_status IN ('not_started','awaiting_approval','changes_requested','approved')),
  ADD CONSTRAINT orders_totals_check CHECK (subtotal >= 0 AND tax >= 0 AND total >= 0);

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_values_check CHECK (quantity > 0 AND unit_price >= 0 AND width_mm > 0 AND height_mm > 0);

ALTER TABLE public.proofs
  ADD CONSTRAINT proofs_version_check CHECK (version > 0),
  ADD CONSTRAINT proofs_status_check CHECK (status IN ('pending','approved','changes_requested','superseded'));

ALTER TABLE public.production_files
  ADD CONSTRAINT production_files_kind_check CHECK (kind IN ('pdf','png','csv_merge','source')),
  ADD CONSTRAINT production_files_size_check CHECK (size_bytes IS NULL OR size_bytes >= 0);

CREATE INDEX orders_due_active_idx ON public.orders(due_at) WHERE status NOT IN ('completed','cancelled');
CREATE INDEX products_configuration_gin_idx ON public.products USING gin(configuration_schema);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles(id,email,full_name)
  VALUES(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',''));
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_own_read ON public.profiles FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = id OR (SELECT public.is_admin()));
CREATE POLICY profiles_own_update ON public.profiles FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id AND role = 'customer');

CREATE POLICY products_public_read ON public.products FOR SELECT TO anon,authenticated USING (active = true);
CREATE POLICY templates_public_read ON public.templates FOR SELECT TO anon,authenticated USING (active = true);

CREATE POLICY designs_customer_all ON public.designs FOR ALL TO authenticated
USING ((SELECT auth.uid()) = customer_id OR (SELECT public.is_admin()))
WITH CHECK ((SELECT auth.uid()) = customer_id OR (SELECT public.is_admin()));

CREATE POLICY orders_customer_read ON public.orders FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = customer_id OR (SELECT public.is_admin()));

CREATE POLICY order_items_customer_read ON public.order_items FOR SELECT TO authenticated
USING (EXISTS(
  SELECT 1 FROM public.orders o
  WHERE o.id = order_id AND (o.customer_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
));

CREATE POLICY proofs_customer_read ON public.proofs FOR SELECT TO authenticated
USING (EXISTS(
  SELECT 1 FROM public.orders o
  WHERE o.id = order_id AND (o.customer_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
));

CREATE POLICY production_files_admin_read ON public.production_files FOR SELECT TO authenticated
USING ((SELECT public.is_admin()));

CREATE POLICY order_events_customer_read ON public.order_events FOR SELECT TO authenticated
USING (EXISTS(
  SELECT 1 FROM public.orders o
  WHERE o.id = order_id AND (o.customer_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
));

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES
  ('artwork','artwork',false,52428800,array['application/pdf','image/png','image/svg+xml','application/postscript']),
  ('proofs','proofs',false,52428800,array['application/pdf','image/png']),
  ('production','production',false,209715200,array['application/pdf','image/png','text/csv'])
ON CONFLICT(id) DO NOTHING;

CREATE POLICY artwork_owner_objects ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'artwork' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text)
WITH CHECK (bucket_id = 'artwork' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

CREATE POLICY proofs_authenticated_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'proofs');

