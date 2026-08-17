-- 1) Segredo do agendador, acessível apenas ao service_role
CREATE TABLE IF NOT EXISTS public.cron_secrets (
  nome text PRIMARY KEY,
  valor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.cron_secrets FROM anon, authenticated;
GRANT ALL ON public.cron_secrets TO service_role;
ALTER TABLE public.cron_secrets ENABLE ROW LEVEL SECURITY;

INSERT INTO public.cron_secrets (nome, valor)
VALUES ('backup-agendado', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (nome) DO NOTHING;

-- 2) Agendamento passa a usar o segredo próprio
DO $$
DECLARE _s text;
BEGIN
  SELECT valor INTO _s FROM public.cron_secrets WHERE nome = 'backup-agendado';
  PERFORM cron.unschedule('backup-agendado-horario');
  PERFORM cron.schedule('backup-agendado-horario', '5 * * * *', format($cmd$
  SELECT net.http_post(
    url := 'https://project--25dd2353-1a07-45dd-a593-d52eec73a397.lovable.app/api/public/hooks/backup-agendado',
    headers := %L::jsonb,
    body := '{}'::jsonb
  ) as request_id;
$cmd$, json_build_object('Content-Type','application/json','x-cron-secret',_s)::text));
END $$;

-- 3) Configuracoes: leitura ampla somente para chaves operacionais
DROP POLICY IF EXISTS configuracoes_select ON public.configuracoes;
CREATE POLICY configuracoes_select ON public.configuracoes
FOR SELECT TO authenticated
USING (
  chave IN ('metas','mapeamento_status','meta_presencas','inatividade_horas','expediente_inicio','expediente_fim')
  OR public.has_role(auth.uid(), 'admin')
  OR public.tem_permissao(auth.uid(), 'configuracoes', 'visualizar')
);

-- 4) Funcoes de gatilho: nao devem ser chamaveis pela API
REVOKE ALL ON FUNCTION public.impedir_vaga_bloqueada() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.limpar_conversa_vazia() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notificar_novo_colaborador_diaria() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.proteger_campos_privilegiados() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.proteger_ultimo_master() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rs_registrar_historico() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.registrar_auditoria() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 5) Helpers privilegiados: fora do alcance de visitantes anonimos
REVOKE ALL ON FUNCTION public.admin_conversa(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.criador_conversa(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.participa_conversa(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pode_operar(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.somente_dashboard(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.verificar_bloqueio(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cpf_colaborador_diaria(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_conversa(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.criador_conversa(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.participa_conversa(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pode_operar(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.somente_dashboard(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verificar_bloqueio(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cpf_colaborador_diaria(uuid) TO authenticated, service_role;