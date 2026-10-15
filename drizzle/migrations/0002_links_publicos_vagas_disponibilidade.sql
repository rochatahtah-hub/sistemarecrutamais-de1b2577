ALTER TABLE public.captacao_oportunidades ADD COLUMN tipo_diaria text NOT NULL DEFAULT 'selecionada';
ALTER TABLE public.captacao_oportunidades ADD CONSTRAINT captacao_tipo_diaria_valido CHECK (tipo_diaria IN ('selecionada', 'avulsa'));

CREATE OR REPLACE FUNCTION public.validar_inscricao_oportunidade_publicada()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.captacao_oportunidades%ROWTYPE; t public.tenants%ROWTYPE; c public.captacao_config%ROWTYPE; v public.vagas%ROWTYPE;
BEGIN
  SELECT * INTO o FROM public.captacao_oportunidades WHERE id = NEW.oportunidade_id FOR SHARE;
  IF NOT FOUND OR o.tenant_id <> NEW.tenant_id OR o.status <> 'ativa' THEN
    RAISE EXCEPTION 'Esta oportunidade não está mais recebendo cadastros.';
  END IF;
  SELECT * INTO t FROM public.tenants WHERE id = o.tenant_id FOR SHARE;
  IF NOT t.ativo OR t.status <> 'ativo' THEN RAISE EXCEPTION 'Este cadastro não está disponível.'; END IF;
  SELECT * INTO c FROM public.captacao_config WHERE tenant_id = o.tenant_id FOR SHARE;
  IF (o.modalidade = 'clt' AND NOT COALESCE(c.clt_ativa, false)) OR
     (o.modalidade = 'especifica' AND o.tipo_diaria = 'selecionada' AND NOT COALESCE(c.oportunidades_ativa, false)) OR
     (o.modalidade = 'especifica' AND o.tipo_diaria = 'avulsa' AND NOT COALESCE(c.diarias_ativa, true)) THEN
    RAISE EXCEPTION 'Esta oportunidade não está mais disponível.';
  END IF;
  IF o.modalidade <> 'clt' AND o.data_oportunidade < (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN
    RAISE EXCEPTION 'Esta diária já foi encerrada.';
  END IF;
  IF o.vaga_id IS NOT NULL THEN
    SELECT * INTO v FROM public.vagas WHERE id = o.vaga_id FOR SHARE;
    IF NOT FOUND OR v.tenant_id <> o.tenant_id OR v.situacao IN ('FECHADA', 'CANCELADA') OR v.status = 'CANCELAMENTO' THEN
      RAISE EXCEPTION 'Esta vaga foi encerrada ou cancelada.';
    END IF;
  END IF;
  IF NEW.daily_worker_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.daily_workers WHERE id = NEW.daily_worker_id AND tenant_id = NEW.tenant_id
  ) THEN RAISE EXCEPTION 'Cadastro inválido para esta empresa.'; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validar_inscricao_oportunidade_publicada() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER validar_inscricao_oportunidade_publicada BEFORE INSERT ON public.captacao_candidaturas FOR EACH ROW EXECUTE FUNCTION public.validar_inscricao_oportunidade_publicada();