# Pentest Autorizado — Recruta+

Teste de intrusão controlado no ambiente do Recruta+, sem tocar em dados reais. Toda ação destrutiva usa tenants/usuários de teste criados no início e removidos ao final.

## Escopo e princípios

- Somente ambiente Recruta+ (Lovable Cloud atual).
- Sem DoS, sem apagar empresas/candidatos reais, sem expor segredos no relatório.
- Toda evidência salva em `pentest/evidencias/` (JSON + screenshots). Segredos jamais logados.
- Cada achado tem: reprodução, severidade, correção proposta, reteste.

## Setup do laboratório (dados de teste)

1. Criar via SQL: `tenants` PENTEST-A e PENTEST-B; empresas, candidatos, vagas e programação em cada um.
2. Criar via Auth Admin: 6 usuários de teste
   - `pentest-a-admin`, `pentest-a-prog`, `pentest-a-comum` (tenant A)
   - `pentest-b-admin`, `pentest-b-prog` (tenant B)
   - `pentest-anon` (nunca loga — usa só a chave anon)
3. Semear `user_roles`, `profiles.perfil_id`, `tenant_contexto` conforme papel.
4. Registrar todos os IDs em `pentest/fixtures.json` para reuso nos testes.

Cleanup no fim: remover tudo por `tenant_id IN (A,B)` + `auth.admin.deleteUser` dos 6.

## Bateria de testes

Cada bloco é um script Node/Python isolado que grava resultado JSON.

1. **Auth & sessão** — acesso sem token, token adulterado, token expirado, reuso pós-logout, usuário desativado, refresh token roubado.
2. **Escalada de privilégio** — usuário comum tenta: UPDATE em `profiles` (master, perfil_id, tenant_id, ativo), INSERT em `user_roles`, INSERT em `super_admins`, INSERT/UPDATE em `admin_pin`, chamar RPCs admin (`definir_status_tenant`, `excluir_tenant`, `provisionar_tenant`, `renomear_tenant`, `definir_status_erro_sistema`, `arquivar_erros_resolvidos`).
3. **Isolamento entre tenants (crítico)** — com JWT do tenant A, para cada tabela com `tenant_id`: SELECT/INSERT/UPDATE/DELETE mirando IDs do tenant B, inclusive forçando `tenant_id=B` no payload. Repetir invertido.
4. **IDOR** — enumerar IDs reais do tenant B (via admin) e tentar buscá-los como usuário do tenant A (REST direto e RPCs).
5. **RLS por tabela sensível** — matriz automatizada: `vagas`, `candidatos`, `colaboradores`, `daily_workers`, `colaboradores_bloqueados`, `empresas`, `rs_candidatos`, `rs_empresas`, `rs_historico`, `auditoria`, `notificacoes`, `mensagens`, `conversas`, `conversa_participantes`, `perfis_acesso`, `perfil_permissoes`, `permissoes_usuario`, `tenants`, `user_roles`, `super_admins`, `admin_pin`, `cron_secrets`, `backups`, `backup_agendamento`, `tenants_log`, `user_access_logs`.
6. **Manipulação de tenant_id** — payload/URL/RPC. Confirmar que triggers `aplicar_tenant` e `proteger_campos_privilegiados` sobrescrevem.
7. **Link público de captação** — slug válido, inexistente, tenant inativo, tentativa de forçar `tenant_id` no INSERT em `daily_workers`, tentar cadastrar em `candidatos`/`rs_candidatos` como anon.
8. **Acesso anônimo** — varrer todas as tabelas com anon key: esperado 401/permission denied exceto `daily_workers` INSERT (com validação) e `tenant_publico`/`tenant_ativo_para_captacao`.
9. **RPCs & SECURITY DEFINER** — listar via `pg_proc`, checar `proconfig` (search_path) e `EXECUTE` grants; tentar chamar cada uma como anon e como usuário comum.
10. **Endpoints do app** — `src/routes/api/public/*` (webhook backup, cron, receivers): sem assinatura, assinatura ruim, replay, payload malformado.
11. **Server functions** — invocar as autenticadas sem bearer e com bearer de outro tenant.
12. **Injeção controlada** — payloads inertes (`' OR 1=1 --`, `<img onerror>`) em formulários públicos e filtros; confirmar escape.
13. **Frontend/exposição** — grep no bundle produzido por `bun run build` procurando `service_role`, `sb_secret`, `SUPABASE_SERVICE`, e-mails, PII; checar `localStorage`/`sessionStorage`.
14. **Config/headers** — HTTPS, CORS, cookies, mensagens de erro, presença de stack traces.
15. **Auditoria & logs** — confirmar que ações críticas geram linha em `auditoria`/`tenants_log`/`user_access_logs` e que usuário comum não consegue apagar/alterar.
16. **Dependências** — `bun audit` / `npm audit --production` e revisão manual dos avisos altos.
17. **Rate limit** — checar apenas presença de proteção nos endpoints `auth` e `daily_workers` (3–5 requisições rápidas, sem DoS).

## Correções

- Cada vulnerabilidade **CRÍTICA** ou **ALTA** → migração SQL / edit de código no mesmo turno + reteste antes de fechar.
- **MÉDIA/BAIXA** → correção proposta no relatório; aplicar se rápida e sem efeito colateral.
- **INFORMATIVA** → só documentar.
- Atualizar `@security-memory` com as novas regras descobertas.

## Entregáveis

- `pentest/relatorio.md` — relatório técnico com tabela de achados (id, severidade, área, reprodução resumida, correção, status do reteste, risco residual).
- `pentest/evidencias/` — JSONs por teste + screenshots quando aplicável.
- Migrações SQL de correção em `supabase/migrations/`.
- Cleanup executado; laboratório removido; typecheck + build verdes.

## Critério de aprovação

Aprovado apenas se, no reteste final, **nenhum** dos itens abaixo permanecer aberto:
acesso entre tenants, escalada de privilégio, admin sem autorização, RLS inseguro, anon indevido, exposição de segredo, IDOR explorável, RPC/SECURITY DEFINER abusável, endpoint público sem verificação.

## Detalhes técnicos

- Autenticação de teste: `supabase.auth.admin.createUser` + `signInWithPassword` para obter JWT real; nada de forjar tokens.
- Scripts em Node com `@supabase/supabase-js` (chave anon) e `fetch` bruto contra `/rest/v1` e `/rpc` para testes que precisam burlar o SDK.
- Chamada de server functions via `curl` para o preview URL com/sem bearer.
- Nenhum secret impresso em stdout; scripts lêem env e usam `process.env` só dentro das funções.
