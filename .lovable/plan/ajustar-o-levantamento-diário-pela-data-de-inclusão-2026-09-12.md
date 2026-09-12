# Ajustar o Levantamento Diário pela data de inclusão

## Objetivo
Fazer o levantamento considerar as vagas adicionadas no dia analisado, mesmo quando a data programada da vaga for futura.

## Alterações
- Trocar a seleção do levantamento: usar a data em que a vaga foi criada no sistema, no horário de Brasília, em vez da data de confirmação.
- Manter a vaga com o status real; uma vaga ainda não confirmada contará como `Aguardando confirmação`.
- Identificar no detalhamento as vagas cuja data programada é posterior ao dia analisado com o aviso `Fora da data de início`.
- Exibir pendências nos totais e por programador, sem incluí-las no denominador dos percentuais de presença, falta e cancelamento.
- Atualizar os textos da tela e do PDF para refletir “vagas adicionadas”, evitando o termo incorreto “vagas fechadas”.
- Preservar registros históricos; levantamentos já gerados só mudam quando forem reprocessados.

## Validação
- Cobrir com teste o exemplo: vaga adicionada dia 11, programada para dia 15, contabilizada no dia 11 como aguardando e marcada fora da data de início.
- Rodar os testes do cálculo e validar a tela no celular e no computador.

## Detalhes técnicos
- Atualizar a função segura do banco `levantamento_diario_vagas_do_dia` sem ampliar seus acessos.
- Incluir data programada e data de criação no registro usado pelo cálculo e no detalhamento.
- Reutilizar a fórmula existente, que já exclui pendências do denominador dos percentuais.
