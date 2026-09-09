-- Mesmos campos aditivos de vagas (genero, transporte, cidade/bairro, horario
-- estruturado), agora também em captacao_oportunidades — é ali que o
-- responsável de fato cadastra as condições da vaga para o candidato,
-- vinculada ou não a um registro em vagas. Aditivo, sem NOT NULL, sem
-- backfill, sem alterar nenhum registro existente.

ALTER TABLE public.captacao_oportunidades
  ADD COLUMN genero text,
  ADD COLUMN cidade text,
  ADD COLUMN bairro text,
  ADD COLUMN horario_inicio time,
  ADD COLUMN horario_fim time,
  ADD COLUMN intervalo_inicio time,
  ADD COLUMN intervalo_fim time,
  ADD COLUMN transporte_tipo text,
  ADD COLUMN transporte_detalhes text;

ALTER TABLE public.captacao_oportunidades
  ADD CONSTRAINT captacao_oportunidades_genero_check
    CHECK (genero IS NULL OR genero IN ('FEMININO', 'MASCULINO', 'UNISSEX'));

ALTER TABLE public.captacao_oportunidades
  ADD CONSTRAINT captacao_oportunidades_transporte_tipo_check
    CHECK (transporte_tipo IS NULL OR transporte_tipo IN ('FRETADO', 'CONTA_PROPRIA'));
