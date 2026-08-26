-- Consolida "Perfil" e "Nível de acesso" num único campo em Programações da Equipe.
-- Aditivo: só semeia perfis de sistema novos em perfis_acesso; não apaga nem altera nada
-- existente. rs/coordenador_rs já existiam como papel (user_roles) mas nunca tiveram um
-- perfis_acesso correspondente — sem isso, ficariam sem como ser atribuídos pela tela
-- consolidada. Líder/Faturamento/Atendimento/Financeiro são os quatro pedidos.

ALTER TABLE public.perfis_acesso DISABLE TRIGGER trg_auditoria_perfis;

INSERT INTO public.perfis_acesso (tenant_id, chave, nome, descricao, sistema, ativo)
SELECT t.id, v.chave, v.nome, v.descricao, true, true
FROM public.tenants t
CROSS JOIN (VALUES
  ('rs', 'R&S', 'Recrutamento e seleção CLT.'),
  ('coordenador_rs', 'Coordenador de R&S', 'Coordenação do time de recrutamento e seleção CLT.'),
  ('lider', 'Líder', 'Liderança da operação.'),
  ('faturamento', 'Faturamento', 'Faturamento das empresas parceiras.'),
  ('atendimento', 'Atendimento', 'Conferência operacional entre Programação e Financeiro.'),
  ('financeiro', 'Financeiro', 'Processamento dos pagamentos.')
) AS v(chave, nome, descricao)
ON CONFLICT (tenant_id, chave) DO NOTHING;

ALTER TABLE public.perfis_acesso ENABLE TRIGGER trg_auditoria_perfis;

-- Nenhuma permissão é atribuída a esses perfis automaticamente — ficam todas "não permitido"
-- até serem configuradas em Perfis e Permissões, exatamente como os perfis customizados hoje.
