ALTER TABLE public.captacao_candidaturas
  ADD COLUMN IF NOT EXISTS situacao text NOT NULL DEFAULT 'aguardando_contato';

ALTER TABLE public.captacao_candidaturas
  DROP CONSTRAINT IF EXISTS captacao_candidaturas_situacao_check;

ALTER TABLE public.captacao_candidaturas
  ADD CONSTRAINT captacao_candidaturas_situacao_check
  CHECK (situacao IN ('aguardando_contato','ja_chamada','em_vaga','blacklist'));