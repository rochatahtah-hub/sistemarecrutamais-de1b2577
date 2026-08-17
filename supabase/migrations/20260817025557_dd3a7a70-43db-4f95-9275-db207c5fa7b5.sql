INSERT INTO public.super_admins (user_id, observacao)
VALUES ('2e57174b-b81a-4c79-a6ca-4bbf6b005163', 'Conta CEO principal — Recruta+')
ON CONFLICT (user_id) DO NOTHING;