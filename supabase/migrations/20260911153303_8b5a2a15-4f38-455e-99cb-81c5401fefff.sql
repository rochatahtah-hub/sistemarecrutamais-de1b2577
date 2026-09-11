DROP INDEX IF EXISTS public.leads_comerciais_email_ativo_unico;
DROP INDEX IF EXISTS public.leads_comerciais_cnpj_ativo_unico;

CREATE UNIQUE INDEX leads_comerciais_email_confirmado_unico
ON public.leads_comerciais (lower(btrim(email)))
WHERE status IN ('pagamento_pendente', 'convertido');

CREATE UNIQUE INDEX leads_comerciais_cnpj_confirmado_unico
ON public.leads_comerciais (regexp_replace(cnpj, '\D', '', 'g'))
WHERE cnpj IS NOT NULL
  AND regexp_replace(cnpj, '\D', '', 'g') <> ''
  AND status IN ('pagamento_pendente', 'convertido');

CREATE OR REPLACE FUNCTION public.reservar_contratacao_comercial(
  _plano_id uuid,
  _empresa_nome text,
  _responsavel_nome text,
  _email text,
  _telefone text,
  _cnpj text,
  _forma_pagamento text,
  _origem text,
  _referencia text
)
RETURNS TABLE(lead_id uuid, pedido_id uuid, conflito text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(btrim(_email));
  v_cnpj text := nullif(regexp_replace(coalesce(_cnpj, ''), '\D', '', 'g'), '');
  v_preco integer;
  v_conflito_email boolean;
  v_conflito_cnpj boolean := false;
  v_lead_id uuid;
  v_pedido_id uuid;
BEGIN
  IF _forma_pagamento NOT IN ('pix', 'cartao') THEN
    RAISE EXCEPTION 'Forma de pagamento inválida.';
  END IF;

  SELECT preco_mensal_centavos
    INTO v_preco
  FROM public.planos
  WHERE id = _plano_id
    AND ativo
    AND publico
    AND preco_mensal_centavos > 0;

  IF v_preco IS NULL THEN
    RAISE EXCEPTION 'Plano indisponível.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('contratacao-email:' || v_email, 0));
  IF v_cnpj IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('contratacao-cnpj:' || v_cnpj, 0));
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.leads_comerciais l
    WHERE lower(btrim(l.email)) = v_email
      AND (
        l.status = 'convertido'
        OR EXISTS (
          SELECT 1
          FROM public.pedidos_comerciais p
          WHERE p.lead_id = l.id
            AND p.status IN ('criado', 'aguardando_pagamento', 'aprovado')
        )
      )
  ) INTO v_conflito_email;

  IF v_cnpj IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.leads_comerciais l
      WHERE regexp_replace(coalesce(l.cnpj, ''), '\D', '', 'g') = v_cnpj
        AND (
          l.status = 'convertido'
          OR EXISTS (
            SELECT 1
            FROM public.pedidos_comerciais p
            WHERE p.lead_id = l.id
              AND p.status IN ('criado', 'aguardando_pagamento', 'aprovado')
          )
        )
    ) INTO v_conflito_cnpj;
  END IF;

  IF v_conflito_email OR v_conflito_cnpj THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid,
      CASE
        WHEN v_conflito_email AND v_conflito_cnpj THEN 'email_cnpj'
        WHEN v_conflito_email THEN 'email'
        ELSE 'cnpj'
      END;
    RETURN;
  END IF;

  INSERT INTO public.leads_comerciais (
    empresa_nome, responsavel_nome, email, telefone, cnpj, status, plano_interesse_id, origem
  ) VALUES (
    btrim(_empresa_nome), btrim(_responsavel_nome), v_email, _telefone, v_cnpj,
    'checkout_iniciado', _plano_id,
    CASE WHEN _origem = 'pagina_publica' THEN 'pagina_publica' ELSE 'link_direto' END
  ) RETURNING id INTO v_lead_id;

  INSERT INTO public.pedidos_comerciais (
    lead_id, plano_id, referencia, valor_centavos, forma_pagamento
  ) VALUES (
    v_lead_id, _plano_id, _referencia, v_preco, _forma_pagamento
  ) RETURNING id INTO v_pedido_id;

  RETURN QUERY SELECT v_lead_id, v_pedido_id, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.reservar_contratacao_comercial(uuid, text, text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reservar_contratacao_comercial(uuid, text, text, text, text, text, text, text, text) TO service_role;