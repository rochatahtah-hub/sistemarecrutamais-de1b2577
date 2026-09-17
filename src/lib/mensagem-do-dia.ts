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
 * A mensagem daquele dia. `mensagens` já deve vir só com as ativas.
 *
 * Mensagem marcada para uma data específica tem prioridade sobre o rodízio —
 * é o caso de uma data comemorativa ou de um recado pontual da empresa.
 */
export function mensagemDoDia(mensagens: MensagemDiaria[], dataIso: string): MensagemDiaria {
  const doDia = mensagens.filter((m) => m.dataEspecifica === dataIso);
  if (doDia.length > 0) {
    // Ordem estável para o caso raro de haver mais de uma na mesma data.
    return [...doDia].sort((a, b) => a.id.localeCompare(b.id))[0]!;
  }

  const rodizio = [...mensagens]
    .filter((m) => !m.dataEspecifica)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (rodizio.length === 0) return MENSAGEM_PADRAO;

  const indice = ((diasDesdeEpoca(dataIso) % rodizio.length) + rodizio.length) % rodizio.length;
  return rodizio[indice]!;
}

/** Texto pronto para exibir: versículo ganha a referência ao final. */
export function textoParaExibir(m: MensagemDiaria): string {
  if (m.tipo === "versiculo" && m.referencia) return `“${m.texto}” — ${m.referencia}`;
  return m.texto;
}
