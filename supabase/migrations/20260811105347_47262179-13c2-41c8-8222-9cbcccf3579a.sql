DROP POLICY IF EXISTS "chat leitura autenticada" ON storage.objects;
DROP POLICY IF EXISTS "chat upload autenticado" ON storage.objects;
DROP POLICY IF EXISTS "chat update autenticado" ON storage.objects;
DROP POLICY IF EXISTS "chat delete autenticado" ON storage.objects;

CREATE POLICY "chat leitura participantes" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat'
    AND (storage.foldername(name))[2] ~ '^[0-9a-fA-F-]{36}$'
    AND public.participa_conversa(((storage.foldername(name))[2])::uuid, auth.uid())
  );

CREATE POLICY "chat upload participantes" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat'
    AND (storage.foldername(name))[2] ~ '^[0-9a-fA-F-]{36}$'
    AND (
      public.participa_conversa(((storage.foldername(name))[2])::uuid, auth.uid())
      OR public.criador_conversa(((storage.foldername(name))[2])::uuid, auth.uid())
    )
  );

CREATE POLICY "chat update dono" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'chat' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'chat' AND owner = auth.uid());

CREATE POLICY "chat delete dono" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat'
    AND (
      owner = auth.uid()
      OR ((storage.foldername(name))[2] ~ '^[0-9a-fA-F-]{36}$'
          AND public.admin_conversa(((storage.foldername(name))[2])::uuid, auth.uid()))
    )
  );