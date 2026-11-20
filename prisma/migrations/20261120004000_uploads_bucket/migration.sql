-- Private global uploads bucket. Objects are scoped by the first path segment,
-- which must match the authenticated user's UUID.
INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  false,
  10485760,
  ARRAY['image/png','image/jpeg','image/webp','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS uploads_owner_objects ON storage.objects;
CREATE POLICY uploads_owner_objects ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
