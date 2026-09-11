# Corrigir duplicidade indevida na contratação

## Objetivo
Permitir novas contratações com e-mail novo e CNPJ vazio, mantendo o bloqueio real por e-mail ou CNPJ ativo e preservando pagamentos, planos, empresas e dados existentes.

## Diagnóstico confirmado
- O CNPJ vazio já chega ao banco como `NULL` e o índice de CNPJ exclui valores nulos/vazios.
- A criação atual grava o lead como `checkout_iniciado` antes de concluir a criação do pedido e do checkout. Se uma etapa posterior falha, o pedido pode ser cancelado, mas o lead continua considerado ativo.
- O backend transforma qualquer erro de unicidade (`23505`) na mensagem genérica de e-mail ou CNPJ, sem identificar qual índice conflitou.
- Os índices únicos protegem concorrência, mas a definição de “ativo” do CNPJ está mais ampla que a regra do e-mail e precisa ser alinhada.

## Implementação
1. Criar uma migração aditiva que:
   - alinhe os índices parciais de e-mail e CNPJ aos mesmos estados comerciais ativos;
   - ignore definitivamente CNPJ `NULL`, vazio ou sem dígitos;
   - preserve a proteção atômica contra duas tentativas simultâneas.
2. Ajustar a função de contratação no backend para:
   - normalizar e-mail e CNPJ antes de consultar/gravar;
   - verificar separadamente conflitos ativos por e-mail e por CNPJ;
   - emitir mensagens específicas para e-mail, CNPJ ou ambos;
   - reconhecer pelo nome do índice qual conflito venceu em uma corrida concorrente;
   - marcar o lead como não ativo quando a criação do pedido ou do checkout falhar, evitando bloqueio residual.
3. Extrair a classificação de conflitos para uma função pequena e testável, sem alterar a tela ou o fluxo do Mercado Pago.

## Validação
- Cobrir com testes automatizados: e-mail novo, maiúsculas/minúsculas, CNPJ vazio/`NULL`/espaços, CNPJ pontuado, conflitos separados, contratação antiga inativa e corrida concorrente.
- Aplicar a migração no Lovable Cloud e confirmar índices, constraints, triggers, RLS e dados existentes.
- Exercitar o servidor com dados temporários controlados e remover somente esses dados de teste.
- Validar a tela pública no computador e celular até o redirecionamento seguro ao Mercado Pago.
- Não simular aprovação nem disparar cobrança real sem uma transação de teste autorizada; validar webhook/provisionamento por testes isolados e inspeção do caminho idempotente.

## Limites
Nenhum plano, preço, assinatura, empresa, usuário, permissão, dado histórico ou regra da AGIZZE será alterado.
