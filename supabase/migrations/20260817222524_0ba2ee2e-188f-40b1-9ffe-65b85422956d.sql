UPDATE public.tenants SET ativo = true, status = 'ativo' WHERE slug = 'empresa-teste-recruta';
DELETE FROM public.daily_workers WHERE full_name ILIKE '%QA%';