# Project Memory

## Core
Marca "RECRUTA+". UI Enterprise SaaS, tema Dark + Ouro. Nunca usar visual genérico claro/roxo.
Interface e mensagens sempre em português do Brasil.
SaaS multiempresa: toda tabela nova precisa de tenant_id, policy RESTRICTIVE de isolamento e trigger aplicar_tenant.
Banco é a fonte soberana dos dados — nada de cálculo de dashboard a partir de planilha.
Métricas do Recruta+ consideram exclusivamente programadoras com status ATIVO.
Proibido criar GRANT novo para a role anon. Recursos públicos passam por server function.
Módulo CLT (R&S) é isolado do módulo de diárias, com tabelas prefixadas rs_.
LGPD: MODO PRIVACIDADE mascara CPF e telefone. Nunca expor dado pessoal a visitante.

## Memories
- Segurança: ver documento de memória de segurança do projeto (modelo de acesso, exceções deliberadas, regras de migração).
- Pentest autorizado: relatório completo em `pentest/relatorio.md`; F-1/F-2/F-3 corrigidos.
- [Cadastro de diárias](mem/features/cadastro-diarias.md) — nome padronizado em caixa alta, chave Pix e documento de identidade em bucket privado por empresa; ficha do colaborador na Minha Programação e cadastro de funções.
