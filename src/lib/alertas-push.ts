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
  titulo: string;
  corpo: string;
  url: string;
}

export const REGRAS_ALERTA: Record<TipoAlerta, RegraAlerta> = {
  aguardando_confirmacao: {
    modulo: "vagas",
    acao: "visualizar",
    titulo: "Recruta+",
    corpo: "Você tem vagas aguardando confirmação.",
    url: "/vagas",
  },
  atendimento_pendente: {
    modulo: "atendimento",
    acao: "editar",
    titulo: "Recruta+",
    corpo: "Existem atendimentos pendentes de validação.",
    url: "/atendimento",
  },
  sem_vaga_hoje: {
    modulo: "vagas",
    acao: "criar",
    titulo: "Recruta+",
    corpo: "Você ainda não cadastrou nenhuma vaga hoje.",
    url: "/vagas",
  },
  finalizar_programacoes: {
    modulo: "programacao",
    acao: "visualizar",
    titulo: "Recruta+",
    corpo: "Não se esqueça de finalizar suas programações de hoje.",
    url: "/minha-programacao",
  },
};

/** Data (AAAA-MM-DD), hora e dia da semana no horário de Brasília (UTC-3). */
export function agoraBrasilia(agora: Date = new Date()) {
  return agoraNoFuso(agora);
}

export function fusoValido(fuso?: string | null): string {
  try {
    if (fuso) { new Intl.DateTimeFormat("pt-BR", { timeZone: fuso }); return fuso; }
  } catch { /* Configuração antiga inválida: usar padrão seguro. */ }
  return "America/Sao_Paulo";
}

export function agoraNoFuso(agora = new Date(), fuso?: string | null) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: fusoValido(fuso), year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(agora);
  const valor = (tipo: string) => partes.find(p => p.type === tipo)?.value ?? "";
  const dia = `${valor("year")}-${valor("month")}-${valor("day")}`;
  return { dia, hora: Number(valor("hour")), semana: new Date(`${dia}T12:00:00Z`).getUTCDay() };
}

/** Meia-noite local convertida a UTC, incluindo mudanças de horário de verão. */
export function limitesDiaNoFuso(dia: string, fuso?: string | null) {
  const zona = fusoValido(fuso);
  const converter = (data: string) => {
    const alvo = Date.parse(`${data}T00:00:00Z`);
    let utc = alvo;
    for (let i = 0; i < 4; i++) {
      const partes = new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(utc));
      const v = (tipo: string) => partes.find(p => p.type === tipo)?.value ?? "00";
      const local = Date.parse(`${v("year")}-${v("month")}-${v("day")}T${v("hour")}:${v("minute")}:${v("second")}Z`);
      utc += alvo - local;
    }
    return new Date(utc).toISOString();
  };
  const amanha = new Date(Date.parse(`${dia}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);
  return { inicio: converter(dia), fim: converter(amanha) };
}

/** Compatibilidade: a condição real, não o relógio, autoriza os alertas operacionais. */
export function alertaNoHorario(_tipo: TipoAlerta, _hora: number, _semana: number): boolean {
  return true;
}
