CREATE TABLE public.colaboradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.colaboradores TO anon, authenticated;
GRANT ALL ON public.colaboradores TO service_role;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "colaboradores_public_all" ON public.colaboradores FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO anon, authenticated;
GRANT ALL ON public.empresas TO service_role;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "empresas_public_all" ON public.empresas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.importacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_arquivo text NOT NULL,
  data_importacao timestamptz NOT NULL DEFAULT now(),
  quantidade_registros integer NOT NULL DEFAULT 0,
  registros_adicionados integer NOT NULL DEFAULT 0,
  registros_atualizados integer NOT NULL DEFAULT 0,
  registros_ignorados integer NOT NULL DEFAULT 0,
  erros integer NOT NULL DEFAULT 0,
  usuario text NOT NULL DEFAULT 'sistema',
  status text NOT NULL DEFAULT 'concluida',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.importacoes TO anon, authenticated;
GRANT ALL ON public.importacoes TO service_role;
ALTER TABLE public.importacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "importacoes_public_all" ON public.importacoes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.vagas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  descricao text,
  quantidade integer NOT NULL DEFAULT 1,
  status text NOT NULL,
  observacao text,
  importacao_id uuid REFERENCES public.importacoes(id) ON DELETE SET NULL,
  hash_registro text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vagas TO anon, authenticated;
GRANT ALL ON public.vagas TO service_role;
ALTER TABLE public.vagas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vagas_public_all" ON public.vagas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_vagas_data ON public.vagas(data);
CREATE INDEX idx_vagas_colaborador ON public.vagas(colaborador_id);
CREATE INDEX idx_vagas_empresa ON public.vagas(empresa_id);
CREATE INDEX idx_vagas_status ON public.vagas(status);

CREATE TABLE public.configuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  valor jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes TO anon, authenticated;
GRANT ALL ON public.configuracoes TO service_role;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "configuracoes_public_all" ON public.configuracoes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_colaboradores_updated BEFORE UPDATE ON public.colaboradores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_empresas_updated BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_vagas_updated BEFORE UPDATE ON public.vagas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.configuracoes (chave, valor) VALUES
  ('metas', '{"presenca": 70, "falta": 20, "cancelamento": 10}'::jsonb),
  ('mapeamento_status', '{"presenca":["presenca","presença","presente","compareceu","ok","efetivado"],"falta":["falta","faltou","nao compareceu","não compareceu","ausente","no show"],"cancelamento":["cancelamento","cancelado","cancelada","desistiu","cancel"]}'::jsonb);