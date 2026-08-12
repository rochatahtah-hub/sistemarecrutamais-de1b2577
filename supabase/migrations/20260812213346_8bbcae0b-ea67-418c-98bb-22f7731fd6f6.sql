INSERT INTO public.perfil_permissoes (perfil_id, modulo, acao, permitido)
SELECT p.id, m.modulo, a.acao,
       CASE WHEN lower(coalesce(p.chave, p.nome)) IN ('admin','administrador','master') THEN true ELSE false END
FROM public.perfis_acesso p
CROSS JOIN (VALUES ('banco_dados')) AS m(modulo)
CROSS JOIN (VALUES ('visualizar'),('criar'),('editar'),('excluir'),('exportar'),('administrar')) AS a(acao)
ON CONFLICT DO NOTHING;