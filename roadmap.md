# Animação visual RECRUTA+

- [x] Criar uma rede visual reutilizável com estados de interação e movimento reduzido.
- [x] Integrar a rede ao login sem alterar autenticação, textos ou controles.
- [x] Reutilizar a rede no cadastro público e na redefinição de senha.
- [x] Validar login, cadastro, carregamento, sucesso, desktop, celular e console.

# Área de captação (Diárias, Oportunidades específicas, Vagas CLT)

- [x] Estruturas no banco (configuração, oportunidades, cadastros) com isolamento por empresa e histórico.
- [x] Espaço privado para currículos, com acesso apenas por link temporário.
- [x] Permissões da área de Captação por perfil.
- [x] Tela interna: modalidades, criação/edição, arquivar/restaurar, cadastros e exclusão individual.
- [x] Portal público com escolha de modalidade, mantendo o cadastro de diárias igual ao atual.
- [x] Validação real no celular e no computador: diárias, oportunidades, vaga efetiva, duplicidade e área interna.

# Plataforma SaaS comercial

- [x] Preservar a AGIZZE como tenant existente e permanentemente isento do fluxo comercial.
- [x] Separar a página pública de Leads do endereço de acesso atual.
- [x] Ampliar planos e criar leads, pedidos, pagamentos e assinaturas com auditoria e isolamento.
- [x] Integrar Mercado Pago no backend com webhook validado e idempotência.
- [x] Liberar cadastro de empresa e primeiro administrador somente após pagamento confirmado.
- [x] Criar gestão Master de Leads, Planos, Assinaturas, Pagamentos e clientes comerciais.
- [x] Aplicar restrição por inadimplência somente a tenants originados pelo fluxo de Leads.
- [x] Documentar e validar separadamente AGIZZE, nova empresa, links, segurança e pagamentos.

# Levantamento Diário pela inclusão da vaga

- [ ] Considerar vagas pela data em que foram adicionadas, no horário de Brasília.
- [ ] Exibir pendentes e sinalizar vagas com início posterior ao dia analisado.
- [ ] Atualizar textos e PDF e validar o exemplo do dia 11 com início no dia 15.

# Continuação das notificações push

- [x] Revalidar dados e responsabilidades no disparo e na entrega, silenciar vazios e limpar situações resolvidas.
- [x] Testar presença/ausência de vagas, retroativas, atribuição de atendimento e resolução antes da entrega.

- [x] Corrigir o erro de tipagem na exportação de backups sem alterar os dados exportados.
- [x] Verificar inscrição por usuário, cancelamento, condições reais e destinos seguros; corrigir falhas encontradas.
- [x] Executar testes automatizados e conferir a abertura do aplicativo e o botão com sessão real no navegador.
- [ ] Comprovar recebimento em aparelhos reais após publicação (depende de aparelho compatível e autorização de notificações).

# Avisos de levantamento pronto

- [x] Personalizar o nome do administrador e especificar diário ou da quinzena após conclusão real.
- [x] Integrar aviso ao push existente, com permissão, tenant e deduplicação.
- [x] Validar cenários automatizados de nome, modalidade, período completo, permissão, tenant e horário.

# Notificações sem horário fixo e mensagens semanais

- [x] Remover janelas operacionais, respeitar fuso e manter validação atualizada.
- [x] Enviar mensagens independentes de segunda e sexta com deduplicação por usuário e data local.
- [x] Atualizar agendamento existente para verificação horária contínua e testar frequência, condições, cancelamento e entrega simulada.
- [ ] Comprovar recebimento em celular e computador físicos (depende de dispositivos compatíveis e publicação).

# Exceção de sexta-feira — 09/10/2026

- [x] Solicitar disparo imediato e conferir resposta: serviço publicado respondeu com zero envios e nenhum registro semanal.
- [x] Preparar segundo disparo somente hoje às 18h de São Paulo no agendamento horário existente, sem recorrência nas próximas semanas; 20 testes passaram.
- [ ] Efetivar os dois envios no site publicado (a versão publicada falhou com redirect:error, não suportado pelo serviço).

# Correção de entrega push após publicação

- [x] Corrigir incompatibilidade da tela de erro após atualização; prévia abre com a sessão de Talita e compilação aprovada.
- [x] Repetir transporte de lotes recentes ainda não confirmados sem renovar validade; preservar testes solicitados e validar com 65 testes automatizados.
- [x] Enviar teste real para inscrição ativa da conta de Talita: provedor aceitou; exibição física ainda não comprovada.
- [x] Preservar fila até confirmação do dispositivo, repetir consultas transitórias e oferecer teste autenticado no sino ativo.
- [ ] Confirmar recebimento físico pelo botão de teste (depende do aparelho da usuária e da atualização publicada).

- [x] Trocar modo de redirecionamento por manual com rejeição explícita de 3xx; 26 testes passaram e compilação sem erros.
- [x] Conferir registros de aceitação anteriores: existem reservas de envio de sexta e das 18h; isso não comprova exibição nos aparelhos.
- [ ] Atualizar publicação com confirmação de exibição e botão de teste (depende de atualizar o site publicado).
