-- Encerramento do teste ponta-a-ponta do checkout Mercado Pago:
-- desativa o plano de teste (mantém a linha, pois leads_comerciais de teste referenciam ela).
UPDATE public.planos
SET publico = false, ativo = false
WHERE chave = 'teste-diagnostico-mp';
