CREATE TABLE public.colaboradores_bloqueados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf text NOT NULL UNIQUE,
  nome text NOT NULL DEFAULT '',
  motivo text NOT NULL DEFAULT '',
  bloqueado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  bloqueado_por_nome text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.colaboradores_bloqueados TO authenticated;
GRANT ALL ON public.colaboradores_bloqueados TO service_role;

ALTER TABLE public.colaboradores_bloqueados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bloqueados_select" ON public.colaboradores_bloqueados
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "bloqueados_write" ON public.colaboradores_bloqueados
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_bloqueados_updated
  BEFORE UPDATE ON public.colaboradores_bloqueados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.admin_pin (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  pin_hash text NOT NULL,
  falhas integer NOT NULL DEFAULT 0,
  bloqueado_ate timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.admin_pin TO service_role;

ALTER TABLE public.admin_pin ENABLE ROW LEVEL SECURITY;
