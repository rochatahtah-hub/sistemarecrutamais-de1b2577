GRANT INSERT ON public.daily_workers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_workers TO authenticated;
GRANT ALL ON public.daily_workers TO service_role;