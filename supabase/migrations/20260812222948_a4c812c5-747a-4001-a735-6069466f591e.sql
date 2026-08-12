-- ============ MÓDULO R&S CLT (isolado) ============
CREATE TABLE public.rs_empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text NOT NULL DEFAULT '',
  contato text NOT NULL DEFAULT '',
  cidade text NOT NULL DEFAULT '',
  observacao text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX rs_empresas_nome_uniq ON public.rs_empresas (lower(nome));

CREATE TABLE public.rs_candidatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cpf text NOT NULL,
  telefone text NOT NULL DEFAULT '',
  empresa_id uuid REFERENCES public.rs_empresas(id) ON DELETE SET NULL,
  cargo text NOT NULL DEFAULT '',
  data_admissao date,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','desligado')),
  data_desligamento date,
  motivo_desligamento text NOT NULL DEFAULT '',
  recrutador_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recrutador_nome text NOT NULL DEFAULT '',
  observacao text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX rs_candidatos_cpf_uniq ON public.rs_candidatos (cpf);
CREATE INDEX rs_candidatos_empresa_idx ON public.rs_candidatos (empresa_id);
CREATE INDEX rs_candidatos_status_idx ON public.rs_candidatos (status);

CREATE TABLE public.rs_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id uuid NOT NULL REFERENCES public.rs_candidatos(id) ON DELETE CASCADE,
  acao text NOT NULL,
  campo text NOT NULL DEFAULT '',
  valor_anterior text NOT NULL DEFAULT '',
  valor_novo text NOT NULL DEFAULT '',
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_nome text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rs_historico_candidato_idx ON public.rs_historico (candidato_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rs_empresas TO authenticated;
GRANT ALL ON public.rs_empresas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rs_candidatos TO authenticated;
GRANT ALL ON public.rs_candidatos TO service_role;
GRANT SELECT, INSERT ON public.rs_historico TO authenticated;
GRANT ALL ON public.rs_historico TO service_role;

ALTER TABLE public.rs_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rs_candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rs_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rs_empresas_select" ON public.rs_empresas FOR SELECT TO authenticated
  USING (public.tem_permissao(auth.uid(), 'rs_empresas', 'visualizar'));
CREATE POLICY "rs_empresas_insert" ON public.rs_empresas FOR INSERT TO authenticated
  WITH CHECK (public.tem_permissao(auth.uid(), 'rs_empresas', 'criar'));
CREATE POLICY "rs_empresas_update" ON public.rs_empresas FOR UPDATE TO authenticated
  USING (public.tem_permissao(auth.uid(), 'rs_empresas', 'editar'))
  WITH CHECK (public.tem_permissao(auth.uid(), 'rs_empresas', 'editar'));
CREATE POLICY "rs_empresas_delete" ON public.rs_empresas FOR DELETE TO authenticated
  USING (public.tem_permissao(auth.uid(), 'rs_empresas', 'excluir'));

CREATE POLICY "rs_candidatos_select" ON public.rs_candidatos FOR SELECT TO authenticated
  USING (public.tem_permissao(auth.uid(), 'rs_candidatos', 'visualizar'));
CREATE POLICY "rs_candidatos_insert" ON public.rs_candidatos FOR INSERT TO authenticated
  WITH CHECK (public.tem_permissao(auth.uid(), 'rs_candidatos', 'criar'));
CREATE POLICY "rs_candidatos_update" ON public.rs_candidatos FOR UPDATE TO authenticated
  USING (public.tem_permissao(auth.uid(), 'rs_candidatos', 'editar'))
  WITH CHECK (public.tem_permissao(auth.uid(), 'rs_candidatos', 'editar'));
CREATE POLICY "rs_candidatos_delete" ON public.rs_candidatos FOR DELETE TO authenticated
  USING (public.tem_permissao(auth.uid(), 'rs_candidatos', 'excluir'));

CREATE POLICY "rs_historico_select" ON public.rs_historico FOR SELECT TO authenticated
  USING (public.tem_permissao(auth.uid(), 'rs_candidatos', 'visualizar'));
CREATE POLICY "rs_historico_insert" ON public.rs_historico FOR INSERT TO authenticated
  WITH CHECK (public.tem_permissao(auth.uid(), 'rs_candidatos', 'criar'));

CREATE TRIGGER trg_rs_empresas_updated BEFORE UPDATE ON public.rs_empresas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rs_candidatos_updated BEFORE UPDATE ON public.rs_candidatos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validação de status/datas
CREATE OR REPLACE FUNCTION public.rs_validar_candidato()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'desligado' AND NEW.data_desligamento IS NULL THEN
    RAISE EXCEPTION 'Informe a data de desligamento para marcar o candidato como desligado.';
  END IF;
  IF NEW.status = 'ativo' THEN
    NEW.data_desligamento := NULL;
  END IF;
  IF NEW.data_desligamento IS NOT NULL AND NEW.data_admissao IS NOT NULL
     AND NEW.data_desligamento < NEW.data_admissao THEN
    RAISE EXCEPTION 'A data de desligamento não pode ser anterior à data de admissão.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_rs_validar_candidato BEFORE INSERT OR UPDATE ON public.rs_candidatos
  FOR EACH ROW EXECUTE FUNCTION public.rs_validar_candidato();

-- Histórico automático
CREATE OR REPLACE FUNCTION public.rs_registrar_historico()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _nome text;
  _campo text;
  _antes text;
  _depois text;
  _antigo jsonb;
  _novo jsonb;
BEGIN
  SELECT coalesce(p.nome, 'Sistema') INTO _nome FROM public.profiles p WHERE p.id = auth.uid();
  _nome := coalesce(_nome, 'Sistema');

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.rs_historico (candidato_id, acao, campo, valor_novo, usuario_id, usuario_nome)
    VALUES (NEW.id, 'cadastro', '', left(NEW.nome, 300), auth.uid(), _nome);
    RETURN NEW;
  END IF;

  _antigo := to_jsonb(OLD); _novo := to_jsonb(NEW);
  FOREACH _campo IN ARRAY ARRAY['nome','cpf','telefone','empresa_id','cargo','data_admissao','status','data_desligamento','motivo_desligamento','recrutador_nome','observacao'] LOOP
    _antes := _antigo->>_campo;
    _depois := _novo->>_campo;
    IF _antes IS DISTINCT FROM _depois THEN
      INSERT INTO public.rs_historico (candidato_id, acao, campo, valor_anterior, valor_novo, usuario_id, usuario_nome)
      VALUES (NEW.id,
        CASE WHEN _campo = 'status' AND _depois = 'desligado' THEN 'desligamento'
             WHEN _campo = 'data_admissao' THEN 'admissao'
             ELSE 'alteracao' END,
        _campo, left(coalesce(_antes,''), 500), left(coalesce(_depois,''), 500), auth.uid(), _nome);
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_rs_historico AFTER INSERT OR UPDATE ON public.rs_candidatos
  FOR EACH ROW EXECUTE FUNCTION public.rs_registrar_historico();

-- ============ Perfis e permissões do módulo ============
INSERT INTO public.perfis_acesso (chave, nome, descricao, sistema)
VALUES
  ('rs', 'R&S', 'Executa o recrutamento e seleção CLT: candidatos, empresas CLT e indicadores.', true),
  ('coordenadora_ra', 'Coordenadora de R&A', 'Acesso gerencial completo ao módulo de Recrutamento e Seleção CLT.', true)
ON CONFLICT (chave) DO NOTHING;

-- Cadastra os novos módulos para todos os perfis (bloqueados por padrão)
INSERT INTO public.perfil_permissoes (perfil_id, modulo, acao, permitido)
SELECT pa.id, m.modulo, m.acao, false
FROM public.perfis_acesso pa
CROSS JOIN (VALUES
  ('rs_candidatos','visualizar'),('rs_candidatos','criar'),('rs_candidatos','editar'),('rs_candidatos','excluir'),('rs_candidatos','exportar'),
  ('rs_empresas','visualizar'),('rs_empresas','criar'),('rs_empresas','editar'),('rs_empresas','excluir'),
  ('rs_dashboard','visualizar'),('rs_dashboard','exportar'),
  ('rs_levantamento','visualizar'),('rs_levantamento','exportar')
) AS m(modulo, acao)
ON CONFLICT (perfil_id, modulo, acao) DO NOTHING;

-- Libera para admin, R&S e Coordenadora de R&A
UPDATE public.perfil_permissoes pp SET permitido = true
FROM public.perfis_acesso pa
WHERE pa.id = pp.perfil_id
  AND pa.chave IN ('admin','rs','coordenadora_ra')
  AND pp.modulo IN ('rs_candidatos','rs_empresas','rs_dashboard','rs_levantamento');

-- Perfil R&S não exclui registros
UPDATE public.perfil_permissoes pp SET permitido = false
FROM public.perfis_acesso pa
WHERE pa.id = pp.perfil_id AND pa.chave = 'rs'
  AND pp.modulo IN ('rs_candidatos','rs_empresas') AND pp.acao = 'excluir';