
-- 1. Make all upload buckets PRIVATE
UPDATE storage.buckets SET public = false WHERE id IN ('media', 'progress-photos', 'recipe-images');

-- 2. Drop any existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload progress photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view progress photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload recipe images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view recipe images" ON storage.objects;
DROP POLICY IF EXISTS "Users upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users read own files" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Coaches read client files" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read" ON storage.objects;

-- 3. Storage policies: clients manage their own folder
CREATE POLICY "Users upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('media', 'progress-photos', 'recipe-images') AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id IN ('media', 'progress-photos', 'recipe-images') AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id IN ('media', 'progress-photos', 'recipe-images') AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Coaches can read their clients' files
CREATE POLICY "Coaches read client files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id IN ('media', 'progress-photos', 'recipe-images') AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.profiles WHERE coach_id = auth.uid()
  )
);

-- 5. Deny anonymous access to profiles
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- 6. Deny anonymous access to health_entries
CREATE POLICY "Deny anonymous access to health_entries"
ON public.health_entries AS RESTRICTIVE
FOR ALL
TO anon
USING (false);
