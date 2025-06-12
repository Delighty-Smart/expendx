
-- Create avatars bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
SELECT 'avatars', 'avatars', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'avatars'
);

-- Create feedback-images bucket for feedback screenshots
INSERT INTO storage.buckets (id, name, public)
SELECT 'feedback-images', 'feedback-images', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'feedback-images'
);

-- Allow public access to read the avatars
CREATE POLICY "Public Access to Avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload avatars
CREATE POLICY "Users Can Upload Avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Allow users to update their own avatars
CREATE POLICY "Users Can Update Their Avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'avatars');

-- Allow users to delete their own avatars
CREATE POLICY "Users Can Delete Their Avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public access to read feedback images
CREATE POLICY "Public Access to Feedback Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'feedback-images');

-- Allow authenticated users to upload feedback images
CREATE POLICY "Users Can Upload Feedback Images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'feedback-images' AND auth.role() = 'authenticated');

-- Allow users to update their own feedback images
CREATE POLICY "Users Can Update Their Feedback Images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'feedback-images' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'feedback-images');

-- Allow users to delete their own feedback images
CREATE POLICY "Users Can Delete Their Feedback Images"
ON storage.objects FOR DELETE
USING (bucket_id = 'feedback-images' AND auth.uid()::text = (storage.foldername(name))[1]);
