---
name: Alertas por pendências reais
description: Notificações devem refletir o banco atualizado e a responsabilidade do usuário
type: constraint
---
- Alertas internos somente para situações reais que exijam ação, verificadas no backend com dados atualizados, perfil, permissões e tenant.
- Pelo menos uma vaga cadastrada hoje impede o aviso de ausência de cadastro; usar o fuso do usuário ou da empresa, com Brasília como padrão.
- Confirmação e retroativas somente para vagas ainda pendentes; futuras não exigem confirmação antecipada.
- Atendimento somente para pendências atribuídas ao usuário, nunca contagem genérica de toda a empresa.
- Sem pendência real não há notificação, nem aviso genérico substituto; situações resolvidas devem limpar o estado e não gerar alertas repetidos.
- Levantamento pronto: personalizar com o nome real do administrador destinatário e especificar diário ou da quinzena: “Olá Talita Rocha, o levantamento diário já está pronto.” (substituir nome e modalidade conforme o destinatário e relatório).
- Pendências não têm horário fixo nem janela de envio; revalidar antes de cada disparo e entrega e evitar duplicidade.
- Mensagens motivacionais independem de pendências: uma por segunda-feira e uma por sexta-feira para cada usuário inscrito, respeitando autorização e preferências.
- Exceção solicitada para sexta-feira, 09/10/2026: enviar a mensagem de sexta agora e uma segunda vez às 18h de São Paulo; não repetir a exceção nas próximas semanas.
