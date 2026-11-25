-- Standalone activity log. user_id is intentionally not a foreign key.
CREATE TABLE public.user_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  activity VARCHAR(100) NOT NULL,
  location JSONB NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_activities_pkey PRIMARY KEY (id),
  CONSTRAINT user_activities_activity_check
    CHECK (activity ~ '^[a-z][a-z0-9_.:-]*$'),
  CONSTRAINT user_activities_location_check
    CHECK (jsonb_typeof(location) = 'object')
);

CREATE INDEX user_activities_user_id_created_at_idx
  ON public.user_activities(user_id, created_at DESC);
CREATE INDEX user_activities_activity_created_at_idx
  ON public.user_activities(activity, created_at DESC);

ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_activities_own_insert
  ON public.user_activities FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY user_activities_own_select
  ON public.user_activities FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
