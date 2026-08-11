CREATE POLICY "chat leitura autenticada" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat');
CREATE POLICY "chat upload autenticado" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat');
CREATE POLICY "chat update autenticado" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'chat') WITH CHECK (bucket_id = 'chat');
CREATE POLICY "chat delete autenticado" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat');