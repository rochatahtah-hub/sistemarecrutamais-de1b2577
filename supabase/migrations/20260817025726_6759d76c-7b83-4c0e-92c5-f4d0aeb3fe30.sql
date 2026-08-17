ALTER TABLE public.daily_workers
  ADD COLUMN IF NOT EXISTS transporte_proprio boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transporte_tipos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS precisa_fretado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transporte_observacao text NOT NULL DEFAULT '';