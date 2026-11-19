-- Persist the public signup fields when Supabase Auth creates a profile.
-- Role is deliberately fixed to customer: public signup must not grant admin access.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles(id, email, full_name, phone, role)
  VALUES(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    'customer'
  );
  RETURN new;
END;
$$;
