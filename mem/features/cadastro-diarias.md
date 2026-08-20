---
name: Cadastro de colaboradores para diárias
description: Regras de nome padronizado, chave Pix e documento de identidade no banco de colaboradores de diárias
type: feature
---

- Nome do colaborador é sempre padronizado: só letras, sem espaços/acentos, CAIXA ALTA (ex.: TALITAGONCALVESDAROCHA). Normalização em `normalizarNomeColaborador` (`src/lib/diarias.ts`), aplicada no portal público e no formulário interno.
- Chave Pix (`daily_workers.pix_chave`): dado sensível, nunca em URL; mascarada no Modo Privacidade.
- Documento de identidade (JPG/PNG/PDF, até 10 MB) fica no bucket privado `documentos-colaboradores`, caminho `<tenant_id>/<colaborador_id>/arquivo`. Acesso só por URL assinada (5 min) e políticas que exigem mesma empresa + permissão `banco_colaboradores`.
- Upload de documento é interno (usuário autenticado). O portal público coleta apenas Pix e demais dados — anônimo não escreve no storage.

## Minha Programação (Pix, documento e funções)
- `candidatos` guarda `funcao`, `pix_chave`, `documento_path`, `documento_nome` — mesmos campos de `daily_workers`.
- Na Minha Programação, a ficha do colaborador (DialogoColaborador) permite salvar função/Pix e anexar, visualizar ou remover o documento (bucket privado, sempre URL assinada de curta duração).
- Tabela `funcoes` (multiempresa) alimenta o seletor de função; inativas não aparecem em novos cadastros, mas continuam no histórico. Gestão na Central de Administração > aba Funções.

## Leitura da ficha colada (parser)
- `src/lib/ficha-texto.ts` interpreta a ficha por RÓTULOS (nunca por posição de linha): nome, CPF, telefone, **Chave Pix** e transporte (possui condução, tipo, ponto de embarque).
- Pix aceita variações "Chave PIX:", "Pix:", "Chave PIX (obrigatório ser em seu nome):" e valor na linha seguinte; guarda o valor literal (ex.: `CPF 086.723.953-01`) sem confundir com o campo CPF.
- Fallback de IA (`src/lib/ficha.functions.ts`) também devolve `pix`.
- Testes do parser: `src/lib/ficha-texto.test.ts`.
