-- Customer-owned delivery addresses with one optional default per customer.
CREATE TABLE public.addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  label TEXT NOT NULL DEFAULT 'Home',
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country_code CHAR(2) NOT NULL DEFAULT 'IN',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT addresses_pkey PRIMARY KEY (id),
  CONSTRAINT addresses_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT addresses_country_code_check CHECK (country_code ~ '^[A-Z]{2}$')
);

CREATE INDEX addresses_customer_id_updated_idx ON public.addresses(customer_id, updated_at DESC);
CREATE UNIQUE INDEX addresses_one_default_per_customer_idx ON public.addresses(customer_id) WHERE is_default;

CREATE TRIGGER addresses_set_updated_at
BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY addresses_customer_all ON public.addresses FOR ALL TO authenticated
USING ((SELECT auth.uid()) = customer_id)
WITH CHECK ((SELECT auth.uid()) = customer_id);
