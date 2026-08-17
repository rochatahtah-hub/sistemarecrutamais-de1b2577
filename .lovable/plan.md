# Corrigir e comprovar as 3 pendências do Recruta+

## Diagnóstico confirmado

- **Dashboard:** Talita está ativa, vinculada à AGIZZERH e tem permissão efetiva de `programacao:visualizar`, mas a função do banco ainda exige papel/perfil `programadora`. Esse filtro exclui Talita (`admin`) e também um usuário habilitado com papel `supervisor`. Além disso, a agregação atual só cria linhas para quem já tem vagas no filtro, podendo ocultar usuários habilitados sem registros.
- **Saúde do Sistema:** `erros_sistema` ainda não possui estado de resolução/arquivamento; a tela apenas lista erros. Portanto, não há como exibir uma lixeira segura somente para resolvidos.
- **Links por empresa:** o portal já usa o slug e valida a empresa ativa no banco, mas a gestão não mostra/copia o link. A função pública ainda aceita slug vazio e escolhe a primeira empresa ativa, o que mantém um fallback dependente do estado geral em vez de exigir um link exclusivo.

## Implementação

### 1. Dashboard da AGIZZERH
- Corrigir `programadoras_da_programacao()` para retornar, por ID, todos e somente os perfis ativos do tenant atualmente administrado com permissão efetiva `programacao:visualizar`, respeitando exceção individual sobre permissão de perfil e sem filtro por cargo/nome.
- Garantir isolamento explícito pelo tenant atual dentro da função, mesmo sendo `SECURITY DEFINER`.
- Inicializar a agregação com todos os usuários habilitados, inclusive quem tem zero vagas no período, mantendo ID como chave e nome completo nos dados.
- Preservar primeiro nome somente na apresentação dos gráficos; filtros/listagens continuam identificando corretamente a pessoa.
- Invalidar a consulta da lista quando permissões ou usuários forem alterados para evitar nomes antigos em cache.

### 2. Saúde do Sistema
- Acrescentar estado de diagnóstico (`pendente`/`resolvido`) e campos de resolução/arquivamento em `erros_sistema`, mantendo os registros para rastreabilidade.
- Quando a mesma falha voltar a ocorrer, reabri-la automaticamente e removê-la do arquivo.
- Na tela, permitir marcar uma falha como resolvida; mostrar lixeira somente em resolvidos.
- Implementar arquivamento individual com confirmação e “Limpar itens resolvidos” em lote, ambos limitados no banco a itens resolvidos do tenant atual.
- A listagem padrão ocultará arquivados, sem apagar diagnósticos nem qualquer dado operacional.

### 3. Links exclusivos por empresa
- Tornar obrigatório um slug ativo e exato na resolução pública; link sem identificador ou de empresa inativa não aceita cadastro.
- Reutilizar `tenants.slug`, a validação do trigger e a RLS atuais, sem nova estrutura duplicada e sem confiar em `tenant_id` arbitrário.
- Exibir em cada empresa o link absoluto `/cadastro-diarias?empresa=<slug>` com ação “Copiar link”.
- Manter links estáveis após renomear a empresa e gerá-los automaticamente para cada novo tenant provisionado.
- Criar e manter “Empresa Teste Recruta+” pelo fluxo oficial de provisionamento para o teste solicitado.

## Validação real

- Comparar no banco o conjunto de usuários ativos da AGIZZERH com permissão efetiva contra o retorno da função e os nomes renderizados no Dashboard; confirmar Talita especificamente.
- Validar a transição de permissão com uma simulação transacional revertida, sem alterar permissões reais de produção.
- Criar um diagnóstico de teste no tenant, resolver, arquivar individualmente e em lote; confirmar que ativos permanecem e contagens operacionais não mudam.
- Abrir os links da AGIZZERH e da Empresa Teste sem sessão, em viewports de notebook e celular; cadastrar registros de teste distintos e confirmar `tenant_id`/isolamento por RLS. Remover apenas os candidatos de teste após a comprovação, mantendo a empresa solicitada.
- Testar empresa inativa sem apagar dados, reativando-a ao final.
- Executar testes seletivos, typecheck do projeto, build completo automático, console/rede no navegador e linter de segurança do banco.
- Entregar o relatório solicitado com causas, contagens, links, resultados e eventuais pendências reais.
