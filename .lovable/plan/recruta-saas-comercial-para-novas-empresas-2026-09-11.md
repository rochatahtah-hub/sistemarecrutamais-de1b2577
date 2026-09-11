# RECRUTA+ SaaS comercial para novas empresas

## Objetivo

Adicionar um fluxo comercial separado para novas empresas, preservando integralmente a operação atual. A AGIZZE será protegida pelo identificador interno imutável `e060a2ca-f718-49b5-bf59-ec43c040336e`, nunca pelo nome ou slug.

## Experiência entregue

- `/leads`: página pública mobile-first com apresentação, recursos, planos ativos e preços carregados do banco.
- `/contratar`: escolha do plano, cadastro da empresa e responsável, CNPJ opcional e pagamento.
- PIX e cartão pelo Mercado Pago, com cobrança mensal recorrente.
- `/acesso`: endereço oficial de login; `/auth` continuará funcionando e redirecionará para preservar links antigos.
- Após confirmação real do pagamento, o responsável recebe acesso para concluir a criação da empresa e da senha.
- Área Admin Master com Leads, Planos, Assinaturas, Pagamentos e indicadores comerciais.
- Empresas comerciais inadimplentes terão o acesso operacional suspenso sem apagar dados; a AGIZZE nunca participa dessa regra.

## Banco e segurança

1. Ampliar `planos` com preço em centavos, periodicidade, recursos, limites, ordem e disponibilidade pública.
2. Adicionar tabelas para leads, pedidos de contratação, pagamentos, assinaturas, eventos de webhook e liberações de cadastro.
3. Identificar explicitamente a origem do tenant (`existente` ou `leads`) e registrar isenção comercial por tenant ID.
4. Criar índices únicos para impedir duplicidade de lead, pedido, pagamento, assinatura, tenant, CNPJ e evento recebido.
5. Aplicar GRANTs mínimos e RLS; dados comerciais ficam disponíveis somente ao Admin Master e ao responsável pelo processo por token temporário.
6. Registrar mudanças em auditoria e no histórico global de tenants.
7. Proteger a AGIZZE contra suspensão, cobrança, exclusão e migração comercial por verificação direta do UUID.
8. Manter preços e regras de liberação exclusivamente no backend; o navegador nunca decide valor ou confirma pagamento.

## Mercado Pago

- Criar integração por `fetch` no backend, sem armazenar cartão e sem expor credenciais.
- Usar checkout seguro/tokenização do Mercado Pago para cartão e QR Code para PIX.
- Enviar uma chave idempotente estável em cada criação de pagamento ou assinatura.
- Criar webhook público com validação HMAC de `x-signature`, registro idempotente e consulta do pagamento diretamente no Mercado Pago.
- Somente o webhook validado poderá marcar pagamento como aprovado e emitir a liberação de cadastro.
- PIX inicia a contratação e a recorrência mensal será acompanhada pela assinatura; cartão poderá usar cobrança recorrente automática conforme suporte da conta Mercado Pago.
- Falhas, estornos, cancelamentos e atrasos atualizarão assinatura e acesso sem apagar dados.

## Provisionamento seguro

1. Pagamento aprovado gera uma liberação única, expirada e vinculada ao pedido.
2. O responsável define senha por uma página pública protegida por token de uso único.
3. Uma operação privilegiada e idempotente cria tenant, perfis padrão, permissões, configurações, perfil do usuário e papel de administrador daquele tenant.
4. O primeiro usuário será administrador do próprio tenant, nunca Admin Master.
5. Repetições do webhook ou da página de cadastro retornam o resultado já criado, sem duplicar registros.
6. Ao concluir, direcionar para `/acesso`.

## Administração e permissões

- Criar módulo exclusivo `comercial_saas` com ações de visualizar, administrar, configurar e exportar.
- Exigir `eh_super_admin()` no backend de toda operação global; não confiar apenas no menu ou em permissões do navegador.
- Manter administradores comuns limitados ao próprio tenant.
- Remover a criação manual simples de empresas do fluxo comercial, sem retirar a ferramenta existente da CEO; tenants comerciais devem nascer apenas após pagamento confirmado.

## Implementação

1. Aplicar migração aditiva, sem apagar ou reescrever dados existentes.
2. Criar serviços seguros para catálogo público, pedido, Mercado Pago, webhook e provisionamento.
3. Criar páginas `/leads`, `/contratar`, conclusão do cadastro e `/acesso`.
4. Criar painel comercial Admin Master e integrar ao menu somente para a CEO.
5. Adicionar metadados próprios às novas páginas públicas e manter áreas internas sem indexação.
6. Atualizar documentação do fluxo, estados, webhook e recuperação operacional.

## Validação

- AGIZZE: login, operação, dados, plano atual e acesso permanecem inalterados; nenhum registro comercial é criado.
- Nova empresa: lead → plano → PIX/cartão → webhook → cadastro → primeiro administrador → login.
- Repetição de pagamento, webhook e cadastro não duplica nada.
- Valor adulterado no navegador é ignorado; o backend usa o preço do banco.
- Webhook sem assinatura válida não altera dados.
- Administrador comum não acessa gestão comercial nem outro tenant.
- Inadimplência afeta somente tenants com origem `leads` e preserva todos os dados.
- Links `/leads` e `/acesso` permanecem separados e funcionam em celular e computador.
- Testes, checagem de tipos, console, rede e fluxos críticos passam antes da entrega.

## Dependências externas

A integração final exige três credenciais do Mercado Pago em modo de teste: Access Token, Public Key e segredo de assinatura do webhook. Elas serão solicitadas e armazenadas como segredos somente no momento da integração; nunca entrarão no código.
