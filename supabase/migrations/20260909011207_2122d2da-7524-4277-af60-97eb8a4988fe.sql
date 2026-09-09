CREATE POLICY curriculos_leitura ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'curriculos'
  AND public.acesso_tenant(NULLIF(split_part(name, '/', 1), '')::uuid)
  AND public.tem_permissao(auth.uid(), 'captacao', 'visualizar')
);

CREATE POLICY curriculos_gravacao ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'curriculos'
  AND public.acesso_tenant(NULLIF(split_part(name, '/', 1), '')::uuid)
  AND public.tem_permissao(auth.uid(), 'captacao', 'criar')
);

CREATE POLICY curriculos_exclusao ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'curriculos'
  AND public.acesso_tenant(NULLIF(split_part(name, '/', 1), '')::uuid)
  AND public.tem_permissao(auth.uid(), 'captacao', 'excluir')
);