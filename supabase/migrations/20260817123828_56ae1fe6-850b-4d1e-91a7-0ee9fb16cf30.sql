DROP POLICY IF EXISTS avatars_leitura ON storage.objects;
CREATE POLICY avatars_leitura ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.acesso_tenant(public.tenant_do_usuario(((storage.foldername(name))[1])::uuid))
    )
  );