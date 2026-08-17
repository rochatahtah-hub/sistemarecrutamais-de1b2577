# Arquitetura multiempresa do Recruta+ — como vai funcionar e o que falta

## Como funciona hoje (verificado no banco)

- Cada empresa é uma linha em `public.tenants` (`nome`, `slug`, `plano_id`, `status`, `limites`). `empresas` continua sendo tomadora de serviço, não empresa-cliente do sistema.
- Cada usuário é ligado a uma empresa por `profiles.tenant_id`. Não há seletor no login.
- ~23 tabelas operacionais têm `tenant_id`. A trigger `aplicar_tenant()` grava a empresa na criação do registro e proíbe mudar a empresa depois.
- O isolamento é feito por políticas restritivas que chamam `acesso_tenant(tenant_id)`.
- Hoje a CEO (super admin) não troca de empresa: ela simplesmente enxerga tudo somado.

## Três falhas que impedem a entrada de Empresas B, C e D

1. `acesso_tenant()` libera qualquer registro com empresa vazia (`tenant_id IS NULL`) — linhas antigas ficariam visíveis para todas as empresas.
2. `tenant_padrao()` está fixo na operação atual e é usado como fallback em `handle_new_user()`; usuário novo cairia sempre na empresa errada.
3. Super admin fura o filtro em todas as tabelas, então relatórios da CEO misturariam dados das quatro empresas — o oposto do isolamento pedido.

## O que será construído

### 1. Empresa ativa (contexto de sessão)
Uma tabela de contexto guarda qual empresa a CEO está operando. As funções de isolamento passam a comparar com essa empresa ativa em vez de liberar tudo. Para usuários comuns o contexto é sempre a própria empresa e não pode ser alterado.

### 2. Seletor no topo + painel central de empresas
- Seletor no cabeçalho, visível apenas para a CEO, listando as empresas e marcando a ativa.
- Painel `/empresas-sistema` (nome a definir) exclusivo da CEO: lista de empresas com nome, plano, status, nº de usuários, botão "Entrar nesta empresa" e cadastro de nova empresa. Sem números somados entre empresas.

### 3. Troca de empresa
Ao trocar A → B: grava a empresa ativa, limpa todo o cache do app e recarrega. Passam a refletir a Empresa B: dashboard e métricas, vagas e programação, candidatos, colaboradores e banco de diárias, bloqueios por CPF, módulo R&S, importações, auditoria, notificações, chat, backups, perfis e permissões, e o selo de empresa no topo. Não mudam: seu login, sua condição de CEO e a estrutura do sistema.

### 4. Blindagem antes do segundo tenant
- Preencher e travar `tenant_id` como obrigatório nas tabelas operacionais; remover a brecha do valor vazio.
- Eliminar o uso de empresa padrão fixa na criação de usuários — usuário novo nasce na empresa de quem o convidou.
- Garantir chaves únicas sempre por empresa (CPF, slugs, chaves de configuração).
- Isolar o portal público de diárias por empresa (link por slug), para o cadastro cair na empresa certa.
- Auditar a troca de empresa: cada troca da CEO gera registro em `auditoria`.

### 5. Testes de aceite
Criar uma Empresa B de teste com dados próprios e confirmar: usuário da A não vê nada da B; a CEO em contexto A vê só A; ao trocar para B vê só B; após atualizar a página o contexto permanece; nenhuma tela mostra soma entre empresas.

## Detalhes técnicos

- Nova tabela `tenant_contexto` (user_id, tenant_id ativo) com RLS própria, e função `tenant_ativo()` = contexto do super admin, senão `profiles.tenant_id`.
- Reescrita de `acesso_tenant()` para `_tenant = tenant_ativo()` (sem cláusula `IS NULL`, sem bypass irrestrito de super admin) e de `aplicar_tenant()` para usar `tenant_ativo()`.
- Backfill `UPDATE ... SET tenant_id = tenant_padrao() WHERE tenant_id IS NULL` seguido de `SET NOT NULL` em todas as tabelas com `tenant_id`.
- `handle_new_user()` deixa de usar `tenant_padrao()`; passa a ler a empresa do convite (metadados do usuário) com validação.
- Front: hook `useTenantAtivo()` + mutation de troca que faz `queryClient.clear()` e recarrega; seletor em `TopBar` e rota do painel de empresas restrita a super admin.

## Ordem de execução sugerida

1. Blindagem (backfill, NOT NULL, fim do fallback fixo) — sem mudança visível.
2. Contexto de empresa ativa no banco + reescrita das funções de isolamento.
3. Seletor no topo e painel central de empresas.
4. Portal público por empresa e auditoria da troca.
5. Testes de aceite com Empresa B.
