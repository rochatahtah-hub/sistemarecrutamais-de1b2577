-- Nova permissão "programacao.editar_aguardando_confirmacao": permite editar empresa/data de
-- uma vaga enquanto ela está "Aguardando confirmação". Concedida por padrão só a admin/
-- coordenador (mesmo critério já usado quando o módulo "atendimento" foi criado); demais perfis
-- podem ser ajustados depois em Perfis e Permissões.
ALTER TABLE public.perfil_permissoes DISABLE TRIGGER trg_auditoria_perfil_perm;

INSERT INTO public.perfil_permissoes (perfil_id, tenant_id, modulo, acao, permitido)
SELECT pa.id, pa.tenant_id, 'programacao', 'editar_aguardando_confirmacao',
       pa.chave IN ('admin', 'coordenador')
FROM public.perfis_acesso pa
ON CONFLICT (perfil_id, modulo, acao) DO NOTHING;

ALTER TABLE public.perfil_permissoes ENABLE TRIGGER trg_auditoria_perfil_perm;

-- Proteção no banco: só permite alterar empresa_id/data de uma vaga enquanto o status ainda é
-- AGUARDANDO, e só para quem tem a permissão acima — validado no backend independentemente do
-- frontend (mesmo padrão de public.impedir_vaga_bloqueada, já existente para outra regra em
-- vagas). Depois que a vaga avança para PRESENCA/FALTA/CANCELAMENTO, esses dois campos ficam
-- travados por esta função, mesmo que alguém tente editar direto pela API.
CREATE OR REPLACE FUNCTION public.impedir_edicao_vaga_aguardando()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id OR NEW.data IS DISTINCT FROM OLD.data THEN
    IF OLD.status <> 'AGUARDANDO' THEN
      RAISE EXCEPTION 'Só é possível editar empresa ou data enquanto a programação está aguardando confirmação.'
        USING ERRCODE = '42501';
    END IF;
    IF NOT public.tem_permissao(auth.uid(), 'programacao', 'editar_aguardando_confirmacao') THEN
      RAISE EXCEPTION 'Sem permissão para editar empresa ou data de programações aguardando confirmação.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_impedir_edicao_vaga_aguardando ON public.vagas;

CREATE TRIGGER trg_impedir_edicao_vaga_aguardando
  BEFORE UPDATE OF empresa_id, data ON public.vagas
  FOR EACH ROW EXECUTE FUNCTION public.impedir_edicao_vaga_aguardando();
