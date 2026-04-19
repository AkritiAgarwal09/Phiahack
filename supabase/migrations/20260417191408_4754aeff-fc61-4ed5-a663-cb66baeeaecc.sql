
-- Restrict avatar bucket: keep public read by URL, but require auth+ownership for listing/managing
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;

CREATE POLICY "Public can view avatars by URL"
  ON storage.objects FOR SELECT
  TO anon
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND auth.role() = 'anon'
    AND false  -- block anonymous listing
  );

CREATE POLICY "Authenticated users can view avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');
