# Esquema do banco — Recruta+

- `../migrations/*.sql` — histórico oficial e executável do banco (95 migrações). É a fonte de verdade.
- `esquema-atual.sql` — retrato completo do estado atual do schema `public`: tabelas e colunas, políticas de RLS, funções, gatilhos e índices. Serve para conferência, auditoria e replicação em outro ambiente.

O retrato não contém dados, senhas, chaves nem informações pessoais — apenas estrutura.

Para regerar o retrato após novas migrações, basta pedir ao assistente uma nova geração do arquivo.
