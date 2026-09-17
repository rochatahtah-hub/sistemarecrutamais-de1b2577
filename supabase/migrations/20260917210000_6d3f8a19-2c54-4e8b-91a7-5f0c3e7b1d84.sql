-- ============ INSCRIÇÕES DE AVISO DE NOVAS VAGAS (Web Push) ============
--
-- Guarda quem, no portal público de uma empresa, pediu para ser avisado quando
-- uma nova oportunidade for publicada.
--
-- O que NÃO fica guardado aqui, de propósito:
--   * nada que identifique a pessoa (o portal é anônimo: não há login, e o CPF
--     só aparece quando ela se candidata — a inscrição não precisa disso);
--   * as chaves `p256dh`/`auth` da inscrição do navegador. O aviso é enviado
--     SEM conteúdo: o texto exibido é fixo, escrito dentro do service worker.
--     Sem payload não há o que criptografar, então essas chaves seriam material
--     secreto guardado à toa.
--
-- Sobra o endpoint (o endereço que o navegador deu para receber o aviso) e a
-- empresa dona do link. O endpoint nunca volta para o navegador: esta tabela é
-- acessível apenas pela chave de serviço, através das funções de servidor.

CREATE TABLE IF NOT EXISTS public.push_inscricoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'cancelada', 'invalida')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelada_em timestamptz
);

CREATE INDEX IF NOT EXISTS push_inscricoes_tenant_idx
  ON public.push_inscricoes (tenant_id, status);

ALTER TABLE public.push_inscricoes ENABLE ROW LEVEL SECURITY;

-- Sem GRANT para anon/authenticated e sem policy permissiva: ninguém alcança
-- esta tabela pelo navegador, nem para ler nem para escrever. Todo acesso passa
-- pelas funções de servidor, que resolvem a empresa pelo slug do link — nunca
-- por um tenant informado pelo cliente.
GRANT ALL ON public.push_inscricoes TO service_role;

DROP TRIGGER IF EXISTS trg_push_inscricoes_updated ON public.push_inscricoes;
CREATE TRIGGER trg_push_inscricoes_updated
  BEFORE UPDATE ON public.push_inscricoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
