/**
 * Escolha da mensagem que acompanha a saudação no Dashboard.
 *
 * A regra é um rodízio pela data, não sorteio: a mesma data sempre devolve a
 * mesma mensagem, então ela não troca ao recarregar a página nem ao trocar de
 * aba durante o dia. E como o índice anda de um em um a cada dia, dois dias
 * seguidos nunca caem na mesma frase (desde que haja mais de uma cadastrada).
 */

export type TipoMensagem =
  "motivacional" | "versiculo" | "reflexao" | "gratidao" | "forca" | "fe" | "profissional";

export interface MensagemDiaria {
  id: string;
  texto: string;
  tipo: TipoMensagem;
  /** Preenchida só em versículo: "Josué 1:9". */
  referencia: string | null;
  /** Quando preenchida, a mensagem vale exatamente nessa data. */
  dataEspecifica: string | null;
}

/** Usada quando não há nenhuma mensagem ativa cadastrada. */
export const MENSAGEM_PADRAO: MensagemDiaria = {
  id: "padrao",
  texto: "Que seu dia seja leve, produtivo e cheio de boas oportunidades.",
  tipo: "motivacional",
  referencia: null,
  dataEspecifica: null,
};

/** Dias inteiros desde 1970 para uma data ISO — sem fuso, sem hora. */
function diasDesdeEpoca(dataIso: string): number {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return Math.floor(Date.UTC(ano ?? 1970, (mes ?? 1) - 1, dia ?? 1) / 86_400_000);
}

/**
 * Número estável a partir do id da pessoa.
 *
 * É o que faz cada uma receber a sua própria frase no mesmo dia, em vez de a
 * equipe inteira abrir o sistema e ler a mesma coisa — a mensagem é para soar
 * como se fosse para ela. Sendo derivado do id, o resultado não muda de uma
 * sessão para outra.
 */
function numeroDaPessoa(chave: string): number {
  let h = 0;
  for (let i = 0; i < chave.length; i++) {
    h = (h * 31 + chave.charCodeAt(i)) % 1_000_003;
  }
  return h;
}

/**
 * A mensagem daquela pessoa naquele dia. `mensagens` já deve vir só com as
 * ativas.
 *
 * `chaveUsuario` desloca o ponto de partida do rodízio: no mesmo dia, cada
 * pessoa cai numa frase diferente, e cada uma continua andando um passo por
 * dia — então ninguém lê a mesma coisa dois dias seguidos.
 *
 * Mensagem marcada para uma data específica escapa disso e vale para todo
 * mundo: é o caso de uma data comemorativa ou de um recado da empresa, que
 * faz sentido a equipe inteira ver junto.
 */
export function mensagemDoDia(
  mensagens: MensagemDiaria[],
  dataIso: string,
  chaveUsuario = "",
): MensagemDiaria {
  const doDia = mensagens.filter((m) => m.dataEspecifica === dataIso);
  if (doDia.length > 0) {
    // Ordem estável para o caso raro de haver mais de uma na mesma data.
    return [...doDia].sort((a, b) => a.id.localeCompare(b.id))[0]!;
  }

  const rodizio = [...mensagens]
    .filter((m) => !m.dataEspecifica)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (rodizio.length === 0) return MENSAGEM_PADRAO;

  const passo = diasDesdeEpoca(dataIso) + numeroDaPessoa(chaveUsuario);
  return rodizio[((passo % rodizio.length) + rodizio.length) % rodizio.length]!;
}

/** Texto pronto para exibir: versículo ganha a referência ao final. */
export function textoParaExibir(m: MensagemDiaria): string {
  if (m.tipo === "versiculo" && m.referencia) return `“${m.texto}” — ${m.referencia}`;
  return m.texto;
}
