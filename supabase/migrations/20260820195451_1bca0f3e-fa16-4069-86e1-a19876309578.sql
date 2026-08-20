ALTER TABLE public.daily_workers
  ADD COLUMN IF NOT EXISTS pix_chave text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS documento_path text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS documento_nome text NOT NULL DEFAULT '';

GRANT SELECT (pix_chave, documento_path, documento_nome) ON public.daily_workers TO authenticated;
GRANT UPDATE (pix_chave, documento_path, documento_nome) ON public.daily_workers TO authenticated;
GRANT INSERT (pix_chave) ON public.daily_workers TO anon;

DROP POLICY IF EXISTS "docs colaboradores leitura" ON storage.objects;
DROP POLICY IF EXISTS "docs colaboradores envio" ON storage.objects;
DROP POLICY IF EXISTS "docs colaboradores atualizacao" ON storage.objects;
DROP POLICY IF EXISTS "docs colaboradores remocao" ON storage.objects;

CREATE POLICY "docs colaboradores leitura" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documentos-colaboradores'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.acesso_tenant(((storage.foldername(name))[1])::uuid)
  AND public.tem_permissao(auth.uid(), 'banco_colaboradores', 'visualizar')
);

CREATE POLICY "docs colaboradores envio" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documentos-colaboradores'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.acesso_tenant(((storage.foldername(name))[1])::uuid)
  AND public.tem_permissao(auth.uid(), 'banco_colaboradores', 'editar')
);

CREATE POLICY "docs colaboradores atualizacao" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'documentos-colaboradores'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.acesso_tenant(((storage.foldername(name))[1])::uuid)
  AND public.tem_permissao(auth.uid(), 'banco_colaboradores', 'editar')
)
WITH CHECK (
  bucket_id = 'documentos-colaboradores'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.acesso_tenant(((storage.foldername(name))[1])::uuid)
  AND public.tem_permissao(auth.uid(), 'banco_colaboradores', 'editar')
);

CREATE POLICY "docs colaboradores remocao" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documentos-colaboradores'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.acesso_tenant(((storage.foldername(name))[1])::uuid)
  AND public.tem_permissao(auth.uid(), 'banco_colaboradores', 'editar')
);