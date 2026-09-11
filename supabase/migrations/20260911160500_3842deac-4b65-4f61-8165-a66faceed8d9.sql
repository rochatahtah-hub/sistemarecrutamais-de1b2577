-- Plano temporário para teste ponta-a-ponta do checkout (R$ 1,00).
-- Será removido logo após o teste (ver migration de limpeza).
INSERT INTO public.planos (id, chave, nome, descricao, preco_mensal_centavos, publico, ativo, ordem)
VALUES (
  '3842deac-4b65-4f61-8165-a66faceed8d9',
  'teste-diagnostico-mp',
  'Teste Diagnóstico',
  'Plano temporário usado para validar o checkout do Mercado Pago. Remover após o teste.',
  100,
  true,
  true,
  999
)
ON CONFLICT (chave) DO NOTHING;
