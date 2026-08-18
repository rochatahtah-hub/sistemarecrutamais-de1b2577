# Project Memory

## Core
Recruta+ em produção: mudanças devem ser incrementais, sem alterar login, telas ou identidade visual sem pedido explícito.
Arquitetura multiempresa: tenant = tabela `tenants`; `empresas` é entidade operacional, nunca tenant.
Segurança sempre no banco (RLS/triggers), nunca só no frontend; sem secrets no frontend.

## Memories
- [Arquitetura multiempresa](mem://architecture/multitenant) — tenants, tenant_id, funções de contexto, super_admin vs master, tabelas globais
- [Privilégios do banco](mem://security/grants) — regras de GRANT/REVOKE para anon, authenticated e funções SECURITY DEFINER
