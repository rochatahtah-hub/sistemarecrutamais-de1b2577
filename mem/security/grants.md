---
name: Regras de privilégios do banco (grants)
description: Quem pode o quê no banco do Recruta+: anon sem grants (exceto insert do cadastro público), authenticated sem TRUNCATE/TRIGGER/REFERENCES, funções de gatilho fechadas
type: constraint
---
- `anon` não tem privilégio nenhum em tabelas do `public`, exceto `INSERT` em `daily_workers` (cadastro público por link de empresa).
- `authenticated` nunca recebe TRUNCATE/TRIGGER/REFERENCES (ignoram RLS).
- Tabelas de uso exclusivo do servidor (sem políticas): admin_pin, cron_secrets, super_admins, app_user_connections — sem grants para anon/authenticated.
- Funções `trigger` sem EXECUTE para PUBLIC/anon/authenticated.
- Funções SECURITY DEFINER públicas para visitante: apenas `tenant_publico(text)` e `tenant_ativo_para_captacao(uuid)`.
**Why:** princípio do menor privilégio; RLS sozinha não cobre TRUNCATE nem execução de funções.
