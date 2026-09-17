/**
 * Tradução de falha técnica em mensagem que pode chegar ao usuário.
 *
 * Repassar `error.message` do Postgres direto para a tela entrega de graça
 * nome de tabela, de coluna, de constraint e pedaço de SQL — é assim que se
 * desenha um ataque sem precisar adivinhar nada. Aqui o detalhe real fica só
 * no log do servidor e o usuário recebe uma frase neutra com um código curto
 * para citar ao administrador, que então acha a ocorrência no log.
 *
 * Só para falha inesperada. Erro de regra de negócio ("Selecione o nível de
 * acesso", "Registro não encontrado nesta empresa") continua sendo lançado
 * direto: é informação que o usuário precisa e não revela nada interno.
 */

function gerarCodigo(): string {
  try {
    return crypto.randomUUID().slice(0, 8);
  } catch {
    return Math.random().toString(36).slice(2, 10);
  }
}

export function erroSeguro(falha: unknown, operacao: string, mensagemPublica?: string): Error {
  const codigo = gerarCodigo();
  // Fica no log do servidor (Cloud → Logs), nunca na resposta.
  console.error(`[${codigo}] falha em ${operacao}:`, falha);
  return new Error(
    `${mensagemPublica ?? "Não foi possível concluir a operação."} Se o problema continuar, informe o código ${codigo} ao administrador.`,
  );
}
