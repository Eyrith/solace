-- =============================================================================
-- Migration: 004_storage_buckets
-- Project00: Provision private & editorial Supabase Storage buckets and RLS
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('sanctuary-media', 'sanctuary-media', false)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO storage.buckets (id, name, public)
    VALUES ('editorial-og-images', 'editorial-og-images', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Private space member upload, read, and delete access scoped to <space_id>/*
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'media_member_upload'
  ) THEN
    CREATE POLICY "media_member_upload" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'sanctuary-media'
        AND (storage.foldername(name))[1] IN (
          SELECT space_id::text FROM public.private_space_members WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'media_member_read'
  ) THEN
    CREATE POLICY "media_member_read" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'sanctuary-media'
        AND (storage.foldername(name))[1] IN (
          SELECT space_id::text FROM public.private_space_members WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'media_member_delete'
  ) THEN
    CREATE POLICY "media_member_delete" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'sanctuary-media'
        AND (storage.foldername(name))[1] IN (
          SELECT space_id::text FROM public.private_space_members WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

