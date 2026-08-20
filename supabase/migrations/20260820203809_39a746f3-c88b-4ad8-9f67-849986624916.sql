ALTER TABLE public.candidatos DISABLE TRIGGER trg_auditoria_candidatos;

UPDATE public.candidatos
SET nome = upper(regexp_replace(translate(nome,
  'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇñÑ',
  'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUCnN'), '[^A-Za-z]', '', 'g'))
WHERE nome <> upper(regexp_replace(translate(nome,
  'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇñÑ',
  'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUCnN'), '[^A-Za-z]', '', 'g'));

ALTER TABLE public.candidatos ENABLE TRIGGER trg_auditoria_candidatos;