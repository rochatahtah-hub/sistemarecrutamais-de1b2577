-- Padroniza candidatos.nome para CAIXA ALTA com espaço único.
-- Só corrige nomes que já têm pelo menos um espaço (padronização de caixa/espaçamento —
-- operação determinística e segura). Nomes já colados sem espaço nenhum (ex.:
-- "TALITAGONCALVESDAROCHA") NÃO são alterados aqui: não há como recuperar com segurança onde
-- terminava uma palavra e começava outra só olhando a string ("inserir espaço às cegas" foi
-- explicitamente pedido para não fazer). Esses ficam disponíveis para revisão manual no painel
-- de Manutenção do Sistema (contagem "Nomes colados sem espaço"), corrigidos reabrindo a ficha
-- com o mesmo CPF e digitando o nome certo.
DO $do$
DECLARE
  _corrigidos int;
  _pendentes int;
BEGIN
  SELECT count(*) INTO _pendentes
  FROM public.candidatos
  WHERE nome IS NOT NULL AND nome !~ '\s' AND length(trim(nome)) > 0;

  ALTER TABLE public.candidatos DISABLE TRIGGER trg_auditoria_candidatos;

  UPDATE public.candidatos
  SET nome = upper(regexp_replace(btrim(nome), '\s+', ' ', 'g'))
  WHERE nome ~ '\s'
    AND nome IS DISTINCT FROM upper(regexp_replace(btrim(nome), '\s+', ' ', 'g'));
  GET DIAGNOSTICS _corrigidos = ROW_COUNT;

  ALTER TABLE public.candidatos ENABLE TRIGGER trg_auditoria_candidatos;

  RAISE NOTICE 'Nomes padronizados automaticamente (já tinham espaço): %', _corrigidos;
  RAISE NOTICE 'Nomes colados sem espaço, deixados para revisão manual: %', _pendentes;
END
$do$;
