# Auditoria multiempresa (multi-tenant) do Recruta+

Nenhuma alteração foi feita: apenas leitura do banco e do código.

## 1. Tabelas COM `tenant_id` (24)

alertas_operacao, auditoria, backup_agendamento, backups, candidatos, colaboradores, colaboradores_bloqueados, configuracoes, conversas, daily_workers, empresas, importacoes, notificacoes, perfil_permissoes, perfis_acesso, permissoes_usuario, profiles, quinzenas_historico, rs_candidatos, rs_cargos, rs_empresas, rs_historico, vagas, tenant_contexto.

Todas com `tenant_id NOT NULL` e com política RESTRICTIVE `*_isolamento_tenant` usando `acesso_tenant(tenant_id)`.

## 2. Tabelas SEM `tenant_id`

| Tabela | Situação |
|---|---|
| conversa_participantes, mensagens, reacoes_mensagem | OK — herdam a empresa da conversa (`acesso_tenant_conversa`) |
| user_roles | Global; cada usuário pertence a uma empresa só — aceitável hoje, mas o papel não é por empresa |
| planos, tenants, super_admins, cron_secrets, app_user_connections | Globais por natureza |
| **erros_sistema** | Global: admin de A vê erros (e user_id) de usuários de B |
| **user_access_logs** | Global: admin de A vê nomes/horários de acesso de usuários de B |
| **presenca_usuarios** | Global: quem "pode operar" vê presença de qualquer empresa |
| **admin_pin** | PIN administrativo único para o sistema inteiro, não por empresa |

## 3. Políticas que usam `tenant_id`

Uma política RESTRICTIVE por tabela operacional (`acesso_tenant(tenant_id)` em USING e WITH CHECK), somada às políticas antigas de papel/permissão. `tenants` usa `id = tenant_atual() OR eh_super_admin()`. `profiles` usa isolamento + exceção para o próprio registro. `daily_workers` tem duas regras com tenant (isolamento + portal público).

## 4 / 6 / 7. Onde está o isolamento

O isolamento é do BANCO, não do frontend:
- `acesso_tenant(t)` = `t = tenant_ativo()` — sem o antigo bypass "super admin vê tudo".
- `tenant_ativo()` = contexto escolhido (só vale para super admin) senão `profiles.tenant_id`.
- Trigger `aplicar_tenant()` sobrescreve o `tenant_id` no INSERT e bloqueia troca no UPDATE.
- Consequência: mexer no `tenant_id` pelo navegador NÃO dá acesso a outra empresa; o valor enviado é ignorado ou rejeitado.

## 5 e 8–13. Consultas do app após a troca

Toda leitura do app passa pelo cliente do usuário, com RLS ativa. Dashboard, candidatos, colaboradores, vagas, Minha Programação, relatórios, bloqueios, auditoria/histórico e configurações são filtrados pelo banco conforme a empresa ativa. Ao trocar de empresa o app cancela consultas, limpa 100% do cache e recarrega a página; não há cache de dados operacionais em localStorage (só a preferência de privacidade).

## 14–17 e 20–26 (respostas curtas)

- Bloqueios, auditoria, histórico R&S, permissões, perfis de acesso e configurações: isolados por empresa.
- Admin de empresa NÃO troca de empresa: `tenant_contexto` só aceita escrita de `eh_super_admin()`.
- Usuário comum não manipula o seletor nem o `tenant_id` (RLS + trigger).
- A CEO enxerga todas as empresas e opera uma por vez.
- Hierarquia técnica real: CEO (`super_admins`; único a trocar de contexto e criar empresas) > Master do tenant (`profiles.master`; todas as permissões dentro da empresa) > papéis e permissões (`user_roles`, `perfil_permissoes`, `permissoes_usuario`), sempre limitados à empresa.
- Empresa nova nasce isolada, porém VAZIA: sem perfis de acesso, permissões, configurações ou administrador — hoje isso exigiria trabalho manual.
- Configuração alterada afeta só a empresa ativa. Globais: planos, tenants, super_admins, papéis, PIN administrativo, erros do sistema, logs de acesso e presença.

## Riscos encontrados (nenhum corrigido)

1. **Painel de Usuários vaza entre empresas (alto).** `listarUsuarios` e as ações de status/exclusão usam a chave de serviço (ignora RLS) e não filtram por empresa: um admin da Empresa A lista e altera usuários da Empresa B.
2. **Painel de Banco de Dados e Backups vazam entre empresas (alto).** `panoramaBanco`, exportações e o backup completo rodam com chave de serviço sobre todas as tabelas: contagens, amostras e arquivos de backup misturam dados de todas as empresas.
3. **Portal público de diárias preso a uma empresa fixa (alto para vender).** A política de INSERT público exige um identificador de empresa fixo no banco; uma empresa nova não teria portal público funcionando.
4. **Logs, erros e presença globais (médio).** Expõem nomes e atividade de usuários de outras empresas para qualquer admin.
5. **PIN administrativo global (médio).** Deveria ser por empresa.
6. **Fallback de empresa padrão (médio).** Usuário criado sem convite com empresa cai na "operação atual" — ao vender para terceiros isso coloca gente estranha dentro da sua operação.
7. **Arquivos sem separação por empresa (médio).** Buckets de avatar, chat e backups não têm caminho/política por empresa.
8. **Papéis globais (baixo).** `user_roles` não tem empresa; não suporta o mesmo e-mail em duas empresas.

## Conclusão

**AINDA NÃO ESTÁ PRONTO PARA MULTI-TENANT.** O núcleo operacional (vagas, candidatos, colaboradores, bloqueios, R&S, auditoria, permissões, configurações) já tem isolamento real garantido pelo banco. O que impede a venda são as áreas administrativas que rodam com privilégio de serviço (Usuários, Banco de Dados/Backups), o portal público preso a uma empresa fixa e as tabelas de log/PIN/arquivos ainda globais.

## Correções propostas (para uma próxima aprovação)

1. Filtrar por empresa ativa todas as funções de servidor privilegiadas (usuários, panorama, exportação, backup) e bloquear ações sobre usuários de outra empresa.
2. Trocar a empresa fixa do portal público por resolução dinâmica (slug no link de cadastro).
3. Adicionar empresa + isolamento em logs de acesso, erros do sistema, presença e PIN administrativo.
4. Separar os arquivos por empresa no armazenamento e ajustar as políticas dos buckets.
5. Criar rotina de provisionamento de empresa nova: perfis de acesso padrão, permissões, configurações iniciais e primeiro administrador.
6. Remover o fallback cego de empresa padrão na criação de usuários, exigindo convite com empresa.