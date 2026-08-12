# Corrigir o portal público de diárias

## O que está acontecendo

Duas causas distintas, ambas confirmadas:

1. **O site publicado está desatualizado.** A página `/auth` do link publicado ainda mostra a aba "Criar acesso" e não tem o botão "Cadastre-se para trabalhar em diárias". As últimas alterações só existem no ambiente de desenvolvimento.

2. **O cadastro público não consegue gravar no banco.** A tabela `daily_workers` está com as regras de acesso (RLS) corretas, mas **não possui nenhuma permissão de acesso concedida** — nem para visitantes anônimos, nem para usuários logados. Ou seja: mesmo abrindo o formulário, o envio falha com erro de permissão, e o Banco de Colaboradores não consegue listar os cadastros.

## O que será feito

### 1. Liberar o acesso à tabela de cadastros de diárias
Migração no banco concedendo:
- inserção para visitantes não logados (o portal público);
- leitura, inserção, edição e exclusão para usuários autenticados (Banco de Colaboradores);
- acesso administrativo para rotinas internas.

As regras de RLS existentes continuam valendo — ninguém anônimo passa a ler dados; apenas o envio do formulário volta a funcionar.

### 2. Validar o fluxo ponta a ponta
Abrir `/cadastro-diarias` sem login, enviar um cadastro de teste e confirmar que ele aparece em `/banco-colaboradores`. Remover o registro de teste em seguida.

### 3. Publicar novamente
Republicar o sistema para que o link `sistemarecrutamais.lovable.app` passe a exibir a tela de acesso atualizada (só "Entrar" + botão de diárias) e o portal funcionando.

## Detalhes técnicos

- Nova migração: `GRANT INSERT ON public.daily_workers TO anon;`, `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated;`, `GRANT ALL ... TO service_role;`
- Nenhuma política de RLS será alterada ou afrouxada.
- Nenhuma mudança de código de aplicação prevista, salvo algum ajuste de mensagem de erro caso o teste revele outro problema.
