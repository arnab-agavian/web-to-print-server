-- Persistent, per-user notification inbox for customers and administrators.
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key TEXT,
  read_at TIMESTAMPTZ(6),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT notifications_recipient_id_dedupe_key_key UNIQUE (recipient_id, dedupe_key)
);

CREATE INDEX notifications_recipient_id_created_idx ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX notifications_recipient_id_read_at_idx ON public.notifications(recipient_id, read_at);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_own_select ON public.notifications FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = recipient_id);

CREATE POLICY notifications_own_update ON public.notifications FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = recipient_id)
WITH CHECK ((SELECT auth.uid()) = recipient_id);

CREATE POLICY notifications_own_delete ON public.notifications FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = recipient_id);
