/**
 * Regras dos alertas automáticos por push para usuários internos.
 * Puro e testável: quem decide SE a condição é verdadeira é o servidor.
 */

export type TipoAlerta =
  | "sem_vaga_hoje"
  | "aguardando_confirmacao"
  | "atendimento_pendente"
  | "finalizar_programacoes";

export interface RegraAlerta {
  modulo: string;
  acao: string;
  /** Janela em horário de Brasília: [inicio, fim) */
  inicio: number;
  fim: number;
  titulo: string;
  corpo: string;
  url: string;
}

export const REGRAS_ALERTA: Record<TipoAlerta, RegraAlerta> = {
  aguardando_confirmacao: {
    modulo: "vagas",
    acao: "visualizar",
    inicio: 9,
    fim: 12,
    titulo: "Recruta+",
    corpo: "Você tem vagas aguardando confirmação.",
    url: "/vagas",
  },
  atendimento_pendente: {
    modulo: "atendimento",
    acao: "editar",
    inicio: 10,
    fim: 17,
    titulo: "Recruta+",
    corpo: "Existem atendimentos pendentes de validação.",
    url: "/atendimento",
  },
  sem_vaga_hoje: {
    modulo: "vagas",
    acao: "criar",
    inicio: 14,
    fim: 18,
    titulo: "Recruta+",
    corpo: "Você ainda não cadastrou nenhuma vaga hoje.",
    url: "/vagas",
  },
  finalizar_programacoes: {
    modulo: "programacao",
    acao: "visualizar",
    inicio: 17,
    fim: 20,
    titulo: "Recruta+",
    corpo: "Não se esqueça de finalizar suas programações de hoje.",
    url: "/minha-programacao",
  },
};

/** Data (AAAA-MM-DD), hora e dia da semana no horário de Brasília (UTC-3). */
export function agoraBrasilia(agora: Date = new Date()) {
  const d = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  return { dia: d.toISOString().slice(0, 10), hora: d.getUTCHours(), semana: d.getUTCDay() };
}

/** Só de segunda a sábado e dentro da janela do alerta — nunca de madrugada nem domingo. */
export function alertaNoHorario(tipo: TipoAlerta, hora: number, semana: number): boolean {
  if (semana === 0) return false;
  const r = REGRAS_ALERTA[tipo];
  return hora >= r.inicio && hora < r.fim;
}
