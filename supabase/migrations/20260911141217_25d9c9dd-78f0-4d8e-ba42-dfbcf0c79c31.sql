UPDATE public.planos
SET preco_mensal_centavos = CASE chave
  WHEN 'essencial' THEN 29700
  WHEN 'profissional' THEN 49700
  WHEN 'enterprise' THEN 89700
  ELSE preco_mensal_centavos
END,
publico = CASE WHEN chave IN ('essencial', 'profissional', 'enterprise') THEN true ELSE publico END,
ordem = CASE chave
  WHEN 'essencial' THEN 1
  WHEN 'profissional' THEN 2
  WHEN 'enterprise' THEN 3
  ELSE ordem
END
WHERE chave IN ('essencial', 'profissional', 'enterprise');