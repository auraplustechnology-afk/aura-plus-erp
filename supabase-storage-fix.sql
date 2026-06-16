-- ============================================================
-- FIX LOGO UPLOAD - Run in Supabase SQL Editor
-- ============================================================

-- Allow authenticated users to upload to company-assets bucket
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES 
  ('Allow authenticated uploads', 'company-assets', 'INSERT', '(auth.role() = ''authenticated'')'),
  ('Allow public reads', 'company-assets', 'SELECT', 'true'),
  ('Allow authenticated updates', 'company-assets', 'UPDATE', '(auth.role() = ''authenticated'')'),
  ('Allow authenticated deletes', 'company-assets', 'DELETE', '(auth.role() = ''authenticated'')')
ON CONFLICT DO NOTHING;

-- Alternative: Use RLS policies on storage.objects directly
CREATE POLICY "company_assets_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'company-assets' AND auth.role() = 'authenticated'
  );

CREATE POLICY "company_assets_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-assets');

CREATE POLICY "company_assets_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'company-assets' AND auth.role() = 'authenticated'
  );

CREATE POLICY "company_assets_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'company-assets' AND auth.role() = 'authenticated'
  );

-- Also fix project-files and avatars buckets
CREATE POLICY "project_files_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-files' AND auth.role() = 'authenticated'
  );

CREATE POLICY "project_files_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-files' AND auth.role() = 'authenticated'
  );

CREATE POLICY "avatars_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.role() = 'authenticated'
  );

CREATE POLICY "avatars_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
