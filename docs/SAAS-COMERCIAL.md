# RECRUTA+ — operação comercial SaaS

## Endereços

- `/leads`: página comercial pública, separada do sistema.
- `/contratar`: contratação de uma nova empresa.
- `/contratacao-status`: confirmação do pagamento.
- `/acesso`: acesso oficial de todos os usuários, inclusive AGIZZE.
- `/auth`: compatibilidade; encaminha para `/acesso`.
- `/comercial-saas`: gestão exclusiva do Admin Master.

## Regra da AGIZZE

A AGIZZE é protegida pelo identificador interno `e060a2ca-f718-49b5-bf59-ec43c040336e`. Ela permanece com origem existente, isenção comercial e status isento. Triggers impedem sua inclusão no fluxo comercial e sua exclusão. Não existe lead, pedido, pagamento ou assinatura comercial para esse tenant.

## Pagamentos e liberação

1. O visitante escolhe um plano cujo preço é lido do banco.
2. O backend cria lead e pedido, evitando processos ativos duplicados por e-mail ou CNPJ.
3. O Mercado Pago processa PIX ou cartão; o RECRUTA+ não recebe dados do cartão.
4. Somente o webhook assinado consulta o pagamento diretamente no provedor e confirma valor e referência.
5. Eventos e pagamentos repetidos são ignorados pelas chaves de idempotência.
6. Após aprovação, o backend cria uma única empresa comercial, copia a configuração-base, cria o primeiro administrador e envia a definição de senha.
7. O acesso operacional de empresas originadas por Leads exige assinatura ativa. Empresas existentes ou isentas não entram nessa regra.

## Configuração do Mercado Pago

O webhook deve apontar para:

`https://recrutamaisrh.ia.br/api/public/hooks/mercado-pago`

As credenciais ficam somente no armazenamento seguro do backend, nos nomes `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET`.

## Validação antes de vendas reais

- Definir preço, recursos e visibilidade dos planos na gestão Master.
- Fazer uma compra em ambiente de teste e confirmar que o webhook cria a nova empresa e o administrador uma única vez.
- Repetir o mesmo webhook e confirmar que não há duplicidade.
- Confirmar que uma empresa comercial inadimplente perde acesso sem apagar seus dados.
- Confirmar que a AGIZZE continua acessando normalmente e não aparece no módulo comercial.