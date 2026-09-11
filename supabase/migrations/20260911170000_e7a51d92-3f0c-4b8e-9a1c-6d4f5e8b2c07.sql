-- Limpeza final dos dados de teste do diagnóstico de checkout Mercado Pago:
-- remove pedidos, leads e o plano temporário usados exclusivamente para os testes.
DELETE FROM public.pedidos_comerciais
WHERE lead_id IN (SELECT id FROM public.leads_comerciais WHERE email ILIKE 'teste-%@example.com');

DELETE FROM public.leads_comerciais
WHERE email ILIKE 'teste-%@example.com';

DELETE FROM public.planos
WHERE chave = 'teste-diagnostico-mp';
