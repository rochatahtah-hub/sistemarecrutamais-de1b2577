# RecrutaMais

PROMPT TÉCNICO — SISTEMA DE GESTÃO DE VAGAS E DASHBOARD DE RECRUTAMENTO

Quero desenvolver um sistema web completo para gestão, análise e acompanhamento de vagas de recrutamento e seleção.

O sistema deverá receber dados de uma planilha Excel, interpretar automaticamente os registros e gerar um Dashboard gerencial interativo, com indicadores, gráficos, rankings, filtros e análises por colaborador, empresa e período.

O sistema deve ser funcional, dinâmico, responsivo e preparado para receber novos dados continuamente.

Não quero apenas um protótipo visual. Todas as funcionalidades descritas abaixo devem funcionar de verdade.

1. OBJETIVO DO SISTEMA

O sistema deverá transformar uma planilha de controle de vagas em uma ferramenta de análise gerencial.

A partir dos dados importados, deverá ser possível acompanhar:

Vagas fechadas

Presenças

Faltas

Cancelamentos

Percentuais de presença

Percentuais de faltas

Percentuais de cancelamentos

Desempenho individual dos colaboradores

Desempenho por empresa

Ranking de colaboradores

Ranking de empresas

Evolução dos resultados ao longo do tempo

Comparação entre períodos

Identificação de empresas com maior índice de faltas

Identificação de empresas com maior índice de presença

Identificação de colaboradores com melhor e pior desempenho

2. IMPORTAÇÃO DO EXCEL

Criar uma área chamada:

IMPORTAR DADOS

O usuário deverá conseguir:

Fazer upload de arquivos .xlsx

Fazer upload de arquivos .xls

Visualizar o arquivo importado

Validar os dados antes da importação definitiva

Identificar automaticamente as colunas

Informar ao usuário quais colunas foram reconhecidas

Avisar sobre campos obrigatórios ausentes

Identificar linhas duplicadas

Identificar dados inválidos

Permitir cancelar a importação

Confirmar a importação

O sistema deverá ser capaz de trabalhar com novas linhas adicionadas posteriormente.

Sempre que novos registros forem importados, os indicadores deverão ser recalculados automaticamente.

3. ESTRUTURA DOS DADOS

O sistema deverá trabalhar, no mínimo, com os seguintes campos:

Data

Colaborador/Recrutador

Empresa

Vaga

Quantidade de vagas

Status

Observação

Os status principais deverão ser:

PRESENÇA

FALTA

CANCELAMENTO

Caso a planilha utilize nomes diferentes para esses status, criar uma etapa de mapeamento durante a importação.

Exemplo:

"Presente", "Presença", "Compareceu" → PRESENÇA

"Faltou", "Falta", "Não compareceu" → FALTA

"Cancelado", "Cancelamento" → CANCELAMENTO

O sistema deve permitir configurar posteriormente outros status.

4. BANCO DE DADOS

Criar uma estrutura de banco de dados adequada para armazenar os registros importados.

Sugestão de entidades:

colaboradores

id

nome

ativo

created_at

updated_at

empresas

id

nome

ativo

created_at

updated_at

vagas

id

data

colaborador_id

empresa_id

descricao

quantidade

status

observacao

created_at

updated_at

importacoes

id

nome_arquivo

data_importacao

quantidade_registros

usuario

status

O banco deverá evitar duplicidade de registros.

5. DASHBOARD PRINCIPAL

Criar uma página inicial chamada:

Dashboard

No topo, apresentar filtros:

Data inicial

Data final

Dia

Semana

Quinzena

Mês

Ano

Colaborador

Empresa

Status

Todos os componentes do Dashboard deverão reagir aos filtros.

6. CARDS DE INDICADORES

Criar cards grandes e fáceis de visualizar:

CARD 1

VAGAS FECHADAS

Mostrar quantidade total.

CARD 2

PRESENÇAS

Mostrar quantidade e percentual.

CARD 3

FALTAS

Mostrar quantidade e percentual.

CARD 4

CANCELAMENTOS

Mostrar quantidade e percentual.

CARD 5

COLABORADORES

Mostrar quantidade de colaboradores ativos no período.

CARD 6

EMPRESAS

Mostrar quantidade de empresas no período.

7. REGRAS DE CÁLCULO

Criar cálculos automáticos.

Total de vagas fechadas

Somar todos os registros considerados como vagas fechadas conforme a estrutura da planilha.

Total de presenças

Contar registros cujo status seja:

PRESENÇA.

Total de faltas

Contar registros cujo status seja:

FALTA.

Total de cancelamentos

Contar registros cujo status seja:

CANCELAMENTO.

Percentual de presença

PRESENÇAS ÷ VAGAS FECHADAS × 100

Percentual de faltas

FALTAS ÷ VAGAS FECHADAS × 100

Percentual de cancelamentos

CANCELAMENTOS ÷ VAGAS FECHADAS × 100

O sistema deve tratar divisão por zero para evitar erros.

IMPORTANTE:

Quando houver comparação entre empresas ou colaboradores, apresentar tanto:

quantidade absoluta

percentual

Isso evita conclusões erradas causadas por empresas ou colaboradores que possuem volumes diferentes de vagas.

8. ANÁLISE POR COLABORADOR

Criar uma seção:

DESEMPENHO DOS COLABORADORES

Exibir uma tabela contendo:

Colaborador Vagas Presenças Faltas Cancelamentos % Presença % Falta

Permitir ordenar a tabela por qualquer coluna.

Criar ranking automático.

Possibilidades:

Maior número de presenças

Menor número de faltas

Menor número de cancelamentos

Maior percentual de presença

Maior número de vagas fechadas

Ao clicar em um colaborador, abrir uma página ou modal com seu desempenho detalhado.

9. ANÁLISE POR EMPRESA

Criar uma seção:

DESEMPENHO DAS EMPRESAS

Tabela:

Empresa Vagas Presenças Faltas Cancelamentos % Presença % Falta % Cancelamento

Permitir ordenar por qualquer indicador.

Criar automaticamente:

TOP EMPRESAS EM PRESENÇAS

Mostrar empresas com maior quantidade de presenças.

TOP EMPRESAS EM FALTAS

Mostrar empresas com maior quantidade de faltas.

TOP EMPRESAS EM CANCELAMENTOS

Mostrar empresas com maior quantidade de cancelamentos.

MAIOR TAXA DE FALTAS

Mostrar empresas com maior percentual de faltas.

IMPORTANTE:

Separar "maior quantidade de faltas" de "maior percentual de faltas".

Exemplo:

Empresa A: 100 vagas / 30 faltas = 30%

Empresa B: 20 vagas / 10 faltas = 50%

Empresa A tem mais faltas em quantidade absoluta.

Empresa B tem pior índice de faltas.

O sistema deverá mostrar as duas informações.

10. GRÁFICOS

Criar gráficos interativos.

Gráfico 1 — Desempenho por colaborador

Gráfico de barras comparando:

Presenças

Faltas

Cancelamentos

Gráfico 2 — Desempenho por empresa

Gráfico de barras com ranking das empresas.

Permitir selecionar:

Presenças

Faltas

Cancelamentos

Percentual de presença

Percentual de faltas

Gráfico 3 — Distribuição geral

Gráfico de pizza ou rosca mostrando:

Presenças

Faltas

Cancelamentos

Gráfico 4 — Evolução temporal

Gráfico de linha mostrando a evolução de:

Presenças

Faltas

Cancelamentos

Permitir visualizar por:

Dia

Semana

Quinzena

Mês

Gráfico 5 — Comparação entre colaboradores

Permitir selecionar dois ou mais colaboradores e comparar seus resultados.

Gráfico 6 — Comparação entre empresas

Permitir selecionar empresas e comparar:

Volume de vagas

Presenças

Faltas

Cancelamentos

Percentuais

11. ANÁLISE POR QUINZENA

Como o controle operacional é realizado por quinzena, criar uma funcionalidade específica para isso.

Dividir automaticamente:

1ª QUINZENA

Dia 1 até dia 15.

2ª QUINZENA

Dia 16 até o último dia do mês.

O usuário deverá conseguir selecionar:

1ª quinzena

2ª quinzena

mês

ano

E visualizar todos os indicadores daquele período.

12. COMPARAÇÃO DE PERÍODOS

Criar uma ferramenta:

COMPARAR PERÍODOS

Permitir selecionar:

Período A: 01/08/2026 a 15/08/2026

Período B: 16/08/2026 a 31/08/2026

Comparar:

Vagas

Presenças

Faltas

Cancelamentos

% presença

% falta

% cancelamento

Mostrar também a variação percentual.

Exemplo:

Presenças: Período A: 250 Período B: 280

Variação: +12%

13. ALERTAS GERENCIAIS

Criar uma área:

ATENÇÃO / ALERTAS

O sistema deverá identificar automaticamente situações relevantes.

Exemplos:

Empresa com percentual de faltas acima da meta

Colaborador com percentual de presença abaixo da meta

Aumento significativo de faltas

Aumento significativo de cancelamentos

Queda de presença em relação ao período anterior

As metas deverão ser configuráveis.

Exemplo:

Meta mínima de presença: 70%.

Se uma empresa estiver abaixo de 70%, apresentar alerta.

14. FILTROS DINÂMICOS

Todos os filtros deverão funcionar em conjunto.

Exemplo:

Selecionar:

Mês: Agosto Quinzena: 2ª Colaborador: Talita Empresa: Empresa X

O Dashboard deverá mostrar exclusivamente os dados correspondentes a essa combinação.

Adicionar botão:

LIMPAR FILTROS

15. PESQUISA

Adicionar campo de pesquisa para:

Colaborador

Empresa

Vaga

A pesquisa deverá funcionar em tempo real.

16. PÁGINA INDIVIDUAL DO COLABORADOR

Ao clicar em um colaborador, abrir uma página detalhada contendo:

Nome do colaborador

Total de vagas: Presenças: Faltas: Cancelamentos:

% Presença: % Falta: % Cancelamento:

Ranking atual:

Empresas atendidas:

Histórico por período:

Gráfico de evolução:

Tabela detalhada das vagas.

17. PÁGINA INDIVIDUAL DA EMPRESA

Ao clicar em uma empresa, abrir:

Nome da empresa

Total de vagas:

Presenças:

Faltas:

Cancelamentos:

% Presença:

% Falta:

% Cancelamento:

Colaboradores responsáveis:

Histórico mensal:

Evolução:

Ranking da empresa:

Tabela detalhada.

18. QUALIDADE DOS DADOS

Criar uma área de validação.

O sistema deverá detectar:

Campos vazios

Empresas sem identificação

Colaboradores sem identificação

Status desconhecido

Datas inválidas

Registros duplicados

Quantidades inválidas

Antes de importar definitivamente, mostrar:

X registros válidos

X registros com problemas

Permitir visualizar os problemas.

19. HISTÓRICO DE IMPORTAÇÕES

Criar página:

HISTÓRICO DE IMPORTAÇÕES

Mostrar:

Nome do arquivo

Data

Hora

Usuário

Quantidade de registros

Registros adicionados

Registros atualizados

Registros ignorados

Erros

20. EXPORTAÇÃO

Criar botões:

EXPORTAR EXCEL

EXPORTAR PDF

O PDF deverá gerar um relatório profissional contendo:

Período analisado

Indicadores

Gráficos

Ranking de colaboradores

Ranking de empresas

Principais resultados

Alertas

21. DESIGN

O sistema deverá possuir aparência profissional e corporativa.

Interface:

Moderna

Limpa

Responsiva

Fácil de utilizar

Compatível com computador, tablet e celular

Utilizar uma identidade visual corporativa.

Priorizar:

Preto

Dourado

Cinza

Branco

Os gráficos devem possuir boa leitura e não ficar visualmente carregados.

Utilizar cards, tabelas, rankings, indicadores e gráficos de forma organizada.

22. MENU DO SISTEMA

Criar menu lateral:

Dashboard

Importar Excel

Vagas

Colaboradores

Empresas

Relatórios

Comparar períodos

Configurações

23. CONFIGURAÇÕES

Criar uma área para configurar:

Meta de presença

Meta de faltas

Meta de cancelamentos

Status utilizados

Colaboradores

Empresas

Regras de cálculo

Aparência do Dashboard

24. RESPONSIVIDADE

O sistema deverá funcionar corretamente em:

Computador

Notebook

Tablet

Celular

No celular, adaptar automaticamente:

Cards

Gráficos

Tabelas

Filtros

Menu

25. SEGURANÇA

Criar sistema de login.

Perfis:

ADMINISTRADOR

Pode:

Importar arquivos

Alterar dados

Excluir dados

Cadastrar colaboradores

Cadastrar empresas

Configurar metas

Visualizar todos os relatórios

USUÁRIO

Pode:

Visualizar Dashboard

Aplicar filtros

Consultar dados

Exportar relatórios

Não poderá alterar configurações críticas.

26. PERFORMANCE

O sistema deverá ser preparado para trabalhar com grande quantidade de registros.

Evitar recalcular toda a base desnecessariamente.

Utilizar:

Paginação

Consultas otimizadas

Índices no banco de dados

Cache quando necessário

Processamento assíncrono para arquivos grandes

27. REGRAS IMPORTANTES

Não assumir que quantidade de faltas significa necessariamente pior desempenho.

Sempre apresentar:

QUANTIDADE + PERCENTUAL.

Também não considerar cancelamento como falta.

Presença, falta e cancelamento devem ser categorias independentes.

O sistema deverá permitir que as regras sejam alteradas futuramente sem necessidade de reconstruir todo o projeto.

28. ARQUITETURA

Escolher uma arquitetura moderna e escalável.

Sugestão:

Frontend: React / Next.js

Backend: Node.js / API

Banco de dados: PostgreSQL

Importação: Biblioteca compatível com Excel XLSX/XLS

Gráficos: Biblioteca moderna de gráficos interativos.

Autenticação: Sistema seguro de login e controle de permissões.

Caso a plataforma utilizada possua uma stack diferente, utilizar a tecnologia mais adequada disponível.

29. EXPERIÊNCIA DO USUÁRIO

O sistema deve ser simples para uma pessoa que não possui conhecimento técnico.

Fluxo principal:

Fazer login

Importar Excel

Sistema validar os dados

Confirmar importação

Dashboard atualizado automaticamente

Aplicar filtros

Analisar colaboradores

Analisar empresas

Comparar períodos

Exportar relatório

Não exigir conhecimentos de programação ou banco de dados.

30. RESULTADO ESPERADO

Ao final, quero um sistema que funcione como uma central de gestão de vagas.

Ao abrir o Dashboard, o gestor deverá conseguir responder rapidamente:

Quantas vagas foram fechadas?

Quantas pessoas compareceram?

Quantas faltaram?

Quantas foram canceladas?

Qual colaborador teve melhor desempenho?

Qual colaborador teve mais faltas?

Qual empresa teve mais presenças?

Qual empresa teve mais faltas?

Qual empresa possui a maior taxa de faltas?

Qual empresa possui a melhor taxa de presença?

Os resultados estão melhorando ou piorando?

Qual foi o desempenho na 1ª e na 2ª quinzena?

Quais empresas ou colaboradores precisam de atenção?

O sistema deve transformar os dados brutos do Excel em informações gerenciais claras para tomada de decisão.

31. CRITÉRIOS DE ACEITAÇÃO

Considerar o projeto concluído somente quando:

[ ] Excel puder ser importado

[ ] Dados forem validados

[ ] Registros forem armazenados corretamente

[ ] Dashboard atualizar automaticamente

[ ] Presenças forem calculadas corretamente

[ ] Faltas forem calculadas corretamente

[ ] Cancelamentos forem calculados corretamente

[ ] Percentuais forem calculados corretamente

[ ] Colaboradores forem identificados automaticamente

[ ] Empresas forem identificadas automaticamente

[ ] Rankings funcionarem

[ ] Filtros funcionarem

[ ] Comparação de períodos funcionar

[ ] Análise por quinzena funcionar

[ ] Gráficos funcionarem

[ ] Alertas funcionarem

[ ] Exportação para Excel funcionar

[ ] Exportação para PDF funcionar

[ ] Login funcionar

[ ] Permissões funcionarem

[ ] Sistema funcionar no celular

[ ] Novos dados puderem ser adicionados sem reconstruir o Dashboard

Antes de finalizar, realizar testes com dados fictícios e verificar se os resultados apresentados no Dashboard correspondem exatamente aos cálculos esperados.

IMPORTANTE: não entregar apenas o código ou uma interface estática. Entregar uma aplicação funcional, com frontend, backend, banco de dados, importação de Excel, processamento dos dados, cálculos, filtros e Dashboard integrado.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://sistemarecrutamais.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/25dd2353-1a07-45dd-a593-d52eec73a397).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
