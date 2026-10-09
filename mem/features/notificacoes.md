---
name: Alertas por pendências reais
description: Notificações devem refletir o banco atualizado e a responsabilidade do usuário
type: constraint
---
- Alertas internos somente para situações reais que exijam ação, verificadas no backend com dados atualizados, perfil, permissões e tenant.
- Pelo menos uma vaga cadastrada hoje impede o aviso de ausência de cadastro; usar o dia de Brasília.
- Confirmação e retroativas somente para vagas ainda pendentes; futuras não exigem confirmação antecipada.
- Atendimento somente para pendências atribuídas ao usuário, nunca contagem genérica de toda a empresa.
- Sem pendência real não há notificação, nem aviso genérico substituto; situações resolvidas devem limpar o estado e não gerar alertas repetidos.