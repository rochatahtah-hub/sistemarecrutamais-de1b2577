---
name: Arquitetura multiempresa (tenant)
description: Regras de tenant do Recruta+: tabela tenants, tenant_id, funções de contexto, super_admin vs master, tabelas globais
type: feature
---
- `empresas` NÃO é tenant (são clientes/tomadoras das vagas). Tenant = tabela `tenants` (slug `operacao-atual` = operação atual).
- `tenant_id` existe em: profiles, empresas, colaboradores, candidatos, vagas, colaboradores_bloqueados, daily_workers, importacoes, quinzenas_historico, alertas_operacao, configuracoes, perfis_acesso, perfil_permissoes, permissoes_usuario, rs_*, notificacoes, auditoria, conversas, backups, backup_agendamento. Default = COALESCE(tenant_atual(), tenant_padrao()).
- Chat (conversa_participantes, mensagens, reacoes_mensagem) herda tenant de `conversas`.
- Globais (sem tenant_id): user_roles (vinculado ao usuário), admin_pin, erros_sistema, user_access_logs, app_user_connections, cron_secrets, planos, tenants, super_admins.
- Isolamento via políticas RESTRICTIVE `*_isolamento_tenant` usando `acesso_tenant(tenant_id)`; as políticas antigas continuam valendo em conjunto.
- Trigger `aplicar_tenant()` define o tenant na inserção e bloqueia troca de tenant_id.
- `eh_super_admin()` (tabela super_admins) = CEO, acesso global. `eh_master()` continua sendo master DO TENANT — nunca usar como bypass global.
- Login NÃO tem seletor de empresa: tenant vem de profiles.tenant_id via `tenant_atual()`.
