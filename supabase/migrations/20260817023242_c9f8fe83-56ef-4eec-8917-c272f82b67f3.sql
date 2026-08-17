DROP POLICY IF EXISTS candidatos_update ON public.candidatos;
CREATE POLICY candidatos_update ON public.candidatos
FOR UPDATE TO authenticated
USING (public.pode_operar(auth.uid()))
WITH CHECK (public.pode_operar(auth.uid()));