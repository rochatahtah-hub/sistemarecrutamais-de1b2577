-- ============ PLANOS: fechar leitura irrestrita ============
--
-- A policy antiga era `USING (true)`: qualquer usuário logado, de qualquer
-- empresa, conseguia ler TODOS os planos direto pela API — inclusive os que
-- ainda não são públicos (rascunho, preço em estudo, plano interno).
--
-- A página pública de planos não depende desta policy: `listarPlanosPublicos`
-- roda no servidor com a chave privilegiada e já filtra ativo + público. E
-- `iniciarContratacao` revalida o plano escolhido do mesmo jeito, então mexer
-- aqui não altera o fluxo de contratação.
--
-- Fica: plano ativo e público é visível; o resto, só para o Admin Master
-- (que continua com acesso total pela policy planos_admin, já existente).

DROP POLICY IF EXISTS planos_select ON public.planos;
CREATE POLICY planos_select ON public.planos FOR SELECT TO authenticated
  USING (
    (ativo AND publico)
    OR public.eh_super_admin(auth.uid())
  );
