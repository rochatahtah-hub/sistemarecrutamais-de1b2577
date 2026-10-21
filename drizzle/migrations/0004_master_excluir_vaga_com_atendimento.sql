CREATE OR REPLACE FUNCTION public.proteger_vaga_com_vinculos()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.pagamentos WHERE vaga_id = OLD.id)
    OR EXISTS (SELECT 1 FROM public.feedbacks WHERE vaga_id = OLD.id) THEN
    RAISE EXCEPTION 'Não é possível excluir: esta vaga possui pagamento ou feedback vinculado. Trate esses registros antes de excluir.' USING ERRCODE = '23503';
  END IF;
  IF (EXISTS (SELECT 1 FROM public.atendimento_conferencias WHERE vaga_id = OLD.id)
    OR EXISTS (SELECT 1 FROM public.atendimento_divergencias WHERE vaga_id = OLD.id))
    AND NOT COALESCE(public.eh_super_admin_atual(), false) THEN
    RAISE EXCEPTION 'Somente o ADM Master pode excluir uma vaga com atendimento vinculado.' USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.proteger_vaga_com_vinculos() FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION public.proteger_vaga_com_vinculos() IS 'Permite apenas ao ADM Master excluir vagas com atendimento; FKs removem conferencias e divergencias atomicamente. Pagamentos e feedbacks sempre bloqueiam exclusao. Politicas de tenant permanecem obrigatorias.';