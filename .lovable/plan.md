# Tela de Backups (Exportar e Baixar)

Nova área administrativa **Backups** para gerar, acompanhar e baixar cópias completas dos dados do sistema.

## O que o usuário verá

- Item **Backups** no menu lateral (grupo Relatórios), visível apenas para administradores.
- Botões: **Gerar backup SQL** e **Gerar backup CSV (.zip)**.
- Tabela de histórico com: data/hora, tipo (SQL ou CSV), tamanho do arquivo, quantidade de tabelas/registros, status (Em andamento / Concluído / Falhou) e botão **Baixar**.
- Aviso claro de que o backup contém dados sensíveis e o link de download expira.

## Como funciona

- O backup cobre as 15 tabelas do sistema: vagas, candidatos, colaboradores, colaboradores_bloqueados, empresas, importacoes, configuracoes, metas/quinzenas_historico, notificacoes, alertas_operacao, auditoria, erros_sistema, profiles, user_roles, admin_pin (sem o hash do PIN).
- **SQL**: um arquivo `.sql` com `INSERT`s por tabela, restaurável em qualquer Postgres.
- **CSV**: um `.zip` com um `.csv` por tabela.
- O arquivo é gravado num bucket privado de backups e o download é feito por link assinado temporário.
- Cada execução grava uma linha na tabela de histórico com status, tamanho e contagens, então a tela mostra o progresso real e falhas.

## Detalhes técnicos

1. Migração: tabela `public.backups` (tipo, status, arquivo_path, tamanho_bytes, total_tabelas, total_registros, erro, criado_por) + GRANTs + RLS restrita a admin via `has_role`.
2. Bucket privado `backups` criado pela ferramenta de storage; políticas em `storage.objects` só para admin (download será por signed URL gerada no servidor).
3. `src/lib/backup.server.ts`: leitura paginada de cada tabela com `supabaseAdmin`, geração do SQL/CSV e do zip.
4. `src/lib/backup.functions.ts`: server functions com `requireSupabaseAuth` + checagem de role admin — `gerarBackup`, `listarBackups`, `urlDownloadBackup`.
5. `src/routes/backups.tsx`: rota nova envolvida em `RequerAdmin`, usando `PageHeader`, tabela responsiva e React Query com refetch enquanto houver backup em andamento.
6. Sidebar: novo item admin-only em `src/components/AppSidebar.tsx` + `ADMIN_ONLY`.
7. `head()` próprio com título/descrição da tela.

## Observação

Este backup cobre os dados das tabelas do aplicativo. O dump completo do banco (incluindo usuários de autenticação) continua disponível em Cloud → Advanced settings → Export data.
