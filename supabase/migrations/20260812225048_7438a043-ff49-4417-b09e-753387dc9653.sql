INSERT INTO public.perfil_permissoes (perfil_id, modulo, acao, permitido)
SELECT pa.id, m.modulo, m.acao, false
FROM public.perfis_acesso pa
CROSS JOIN (SELECT DISTINCT modulo, acao FROM public.perfil_permissoes) m
WHERE pa.chave IN ('rs','coordenador_rs')
ON CONFLICT (perfil_id, modulo, acao) DO NOTHING;

UPDATE public.perfil_permissoes pp
SET permitido = true, updated_at = now()
FROM public.perfis_acesso pa
WHERE pa.id = pp.perfil_id
  AND pa.chave IN ('rs','coordenador_rs')
  AND ((pp.modulo = 'chat' AND pp.acao = 'utilizar')
    OR (pp.modulo = 'dashboard' AND pp.acao = 'visualizar'));