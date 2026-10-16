CREATE POLICY vagas_master_delete ON public.vagas FOR DELETE TO authenticated USING (public.eh_super_admin_atual());
CREATE POLICY vagas_master_select ON public.vagas FOR SELECT TO authenticated USING (public.eh_super_admin_atual());

CREATE OR REPLACE FUNCTION public.proteger_vaga_com_vinculos()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.pagamentos WHERE vaga_id = OLD.id)
    OR EXISTS (SELECT 1 FROM public.atendimento_conferencias WHERE vaga_id = OLD.id)
    OR EXISTS (SELECT 1 FROM public.atendimento_divergencias WHERE vaga_id = OLD.id)
    OR EXISTS (SELECT 1 FROM public.feedbacks WHERE vaga_id = OLD.id) THEN
    RAISE EXCEPTION 'Não é possível excluir: esta vaga possui pagamento, atendimento ou feedback vinculado. Trate esses registros antes de excluir.' USING ERRCODE = '23503';
  END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.proteger_vaga_com_vinculos() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER vagas_proteger_exclusao_vinculos BEFORE DELETE ON public.vagas FOR EACH ROW EXECUTE FUNCTION public.proteger_vaga_com_vinculos();