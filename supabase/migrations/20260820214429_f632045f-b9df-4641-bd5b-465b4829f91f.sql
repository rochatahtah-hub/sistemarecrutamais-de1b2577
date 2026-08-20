
ALTER TABLE public.funcoes
  ADD COLUMN IF NOT EXISTS descricao text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS perfil_id uuid REFERENCES public.perfis_acesso(id) ON DELETE SET NULL;

ALTER TABLE public.perfis_acesso
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.sincronizar_perfil_funcao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _base text;
  _chave text;
  _i int := 0;
  _perfil uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.perfil_id IS NOT NULL THEN
      RETURN NEW;
    END IF;

    _base := 'funcao_' || regexp_replace(
      lower(translate(NEW.nome,
        'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇáàãâäéèêëíìîïóòõôöúùûüç',
        'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc')),
      '[^a-z0-9]+', '_', 'g');
    _base := trim(both '_' from _base);
    _chave := _base;

    WHILE EXISTS (
      SELECT 1 FROM public.perfis_acesso p
      WHERE p.tenant_id = NEW.tenant_id AND p.chave = _chave
    ) LOOP
      _i := _i + 1;
      _chave := _base || '_' || _i;
    END LOOP;

    INSERT INTO public.perfis_acesso (chave, nome, descricao, sistema, ativo, tenant_id)
    VALUES (_chave, NEW.nome, COALESCE(NEW.descricao, ''), false, COALESCE(NEW.ativo, true), NEW.tenant_id)
    RETURNING id INTO _perfil;

    NEW.perfil_id := _perfil;
    RETURN NEW;
  END IF;

  IF NEW.perfil_id IS NOT NULL AND (
       NEW.nome IS DISTINCT FROM OLD.nome
    OR NEW.descricao IS DISTINCT FROM OLD.descricao
    OR NEW.ativo IS DISTINCT FROM OLD.ativo
  ) THEN
    UPDATE public.perfis_acesso
       SET nome = NEW.nome,
           descricao = COALESCE(NEW.descricao, ''),
           ativo = COALESCE(NEW.ativo, true),
           updated_at = now()
     WHERE id = NEW.perfil_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sincronizar_perfil_funcao_ins ON public.funcoes;
CREATE TRIGGER trg_sincronizar_perfil_funcao_ins
BEFORE INSERT ON public.funcoes
FOR EACH ROW EXECUTE FUNCTION public.sincronizar_perfil_funcao();

DROP TRIGGER IF EXISTS trg_sincronizar_perfil_funcao_upd ON public.funcoes;
CREATE TRIGGER trg_sincronizar_perfil_funcao_upd
AFTER UPDATE ON public.funcoes
FOR EACH ROW EXECUTE FUNCTION public.sincronizar_perfil_funcao();

REVOKE EXECUTE ON FUNCTION public.sincronizar_perfil_funcao() FROM anon, authenticated;

-- Backfill: cria perfis para funções já existentes (sem gerar auditoria sem usuário)
ALTER TABLE public.perfis_acesso DISABLE TRIGGER trg_auditoria_perfis;

DO $backfill$
DECLARE
  r record;
  _base text;
  _chave text;
  _i int;
  _perfil uuid;
BEGIN
  FOR r IN SELECT * FROM public.funcoes WHERE perfil_id IS NULL LOOP
    _base := 'funcao_' || regexp_replace(
      lower(translate(r.nome,
        'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇáàãâäéèêëíìîïóòõôöúùûüç',
        'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc')),
      '[^a-z0-9]+', '_', 'g');
    _base := trim(both '_' from _base);
    _chave := _base;
    _i := 0;
    WHILE EXISTS (
      SELECT 1 FROM public.perfis_acesso p WHERE p.tenant_id = r.tenant_id AND p.chave = _chave
    ) LOOP
      _i := _i + 1;
      _chave := _base || '_' || _i;
    END LOOP;

    INSERT INTO public.perfis_acesso (chave, nome, descricao, sistema, ativo, tenant_id)
    VALUES (_chave, r.nome, COALESCE(r.descricao, ''), false, COALESCE(r.ativo, true), r.tenant_id)
    RETURNING id INTO _perfil;

    UPDATE public.funcoes SET perfil_id = _perfil WHERE id = r.id;
  END LOOP;
END;
$backfill$;

ALTER TABLE public.perfis_acesso ENABLE TRIGGER trg_auditoria_perfis;
