-- Campos aditivos da vaga: gênero, cidade/bairro, horário estruturado e transporte.
-- Nada é removido, renomeado ou tornado obrigatório — vagas existentes continuam
-- funcionando com esses campos nulos até serem editadas.

ALTER TABLE public.vagas
  ADD COLUMN genero text,
  ADD COLUMN cidade text,
  ADD COLUMN bairro text,
  ADD COLUMN horario_inicio time,
  ADD COLUMN horario_fim time,
  ADD COLUMN intervalo_inicio time,
  ADD COLUMN intervalo_fim time,
  ADD COLUMN transporte_tipo text,
  ADD COLUMN transporte_detalhes text;

ALTER TABLE public.vagas
  ADD CONSTRAINT vagas_genero_check
    CHECK (genero IS NULL OR genero IN ('FEMININO', 'MASCULINO', 'UNISSEX'));

ALTER TABLE public.vagas
  ADD CONSTRAINT vagas_transporte_tipo_check
    CHECK (transporte_tipo IS NULL OR transporte_tipo IN ('FRETADO', 'CONTA_PROPRIA'));

COMMENT ON COLUMN public.vagas.genero IS 'Gênero exigido pela vaga (opcional; obrigatório apenas para publicar em captação).';
COMMENT ON COLUMN public.vagas.transporte_tipo IS 'FRETADO ou CONTA_PROPRIA — detalhes livres em transporte_detalhes quando FRETADO.';
