CREATE TABLE public.rs_cargos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX rs_cargos_nome_unico ON public.rs_cargos (lower(nome));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rs_cargos TO authenticated;
GRANT ALL ON public.rs_cargos TO service_role;

ALTER TABLE public.rs_cargos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rs_cargos_select" ON public.rs_cargos FOR SELECT TO authenticated
  USING (public.tem_permissao(auth.uid(), 'rs_empresas', 'visualizar'));
CREATE POLICY "rs_cargos_insert" ON public.rs_cargos FOR INSERT TO authenticated
  WITH CHECK (public.tem_permissao(auth.uid(), 'rs_empresas', 'criar'));
CREATE POLICY "rs_cargos_update" ON public.rs_cargos FOR UPDATE TO authenticated
  USING (public.tem_permissao(auth.uid(), 'rs_empresas', 'editar'))
  WITH CHECK (public.tem_permissao(auth.uid(), 'rs_empresas', 'editar'));
CREATE POLICY "rs_cargos_delete" ON public.rs_cargos FOR DELETE TO authenticated
  USING (public.tem_permissao(auth.uid(), 'rs_empresas', 'excluir'));

CREATE TRIGGER update_rs_cargos_updated_at
  BEFORE UPDATE ON public.rs_cargos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.rs_cargos (nome)
SELECT DISTINCT btrim(cargo) FROM public.rs_candidatos
WHERE btrim(coalesce(cargo,'')) <> ''
ON CONFLICT DO NOTHING;