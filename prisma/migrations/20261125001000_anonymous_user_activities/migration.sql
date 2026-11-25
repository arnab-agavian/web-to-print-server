-- Allow public API activity records without an authenticated user.
-- Existing user IDs are preserved.
ALTER TABLE public.user_activities ALTER COLUMN user_id DROP NOT NULL;
