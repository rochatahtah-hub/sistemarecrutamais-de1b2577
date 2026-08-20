---
name: Cadastro de colaboradores para diárias
description: Regras de nome padronizado, chave Pix e documento de identidade no banco de colaboradores de diárias
type: feature
---

- Nome do colaborador é sempre padronizado: só letras, sem espaços/acentos, CAIXA ALTA (ex.: TALITAGONCALVESDAROCHA). Normalização em `normalizarNomeColaborador` (`src/lib/diarias.ts`), aplicada no portal público e no formulário interno.
- Chave Pix (`daily_workers.pix_chave`): dado sensível, nunca em URL; mascarada no Modo Privacidade.
- Documento de identidade (JPG/PNG/PDF, até 10 MB) fica no bucket privado `documentos-colaboradores`, caminho `<tenant_id>/<colaborador_id>/arquivo`. Acesso só por URL assinada (5 min) e políticas que exigem mesma empresa + permissão `banco_colaboradores`.
- Upload de documento é interno (usuário autenticado). O portal público coleta apenas Pix e demais dados — anônimo não escreve no storage.
