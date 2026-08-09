export type StatusVaga = "AGUARDANDO" | "PRESENCA" | "FALTA" | "CANCELAMENTO";

export const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO: "⏳ Aguardando confirmação",
  PRESENCA: "Presença",
  FALTA: "Falta",
  CANCELAMENTO: "Cancelamento",
};

export interface VagaRegistro {
  id: string;
  data: string;
  colaborador_id: string | null;
  empresa_id: string | null;
  colaborador: string;
  empresa: string;
  descricao: string;
  quantidade: number;
  status: string;
  observacao: string;
}

export interface Metas {
  presenca: number;
  falta: number;
  cancelamento: number;
}

export interface MapeamentoStatus {
  presenca: string[];
  falta: string[];
  cancelamento: string[];
}

export const METAS_PADRAO: Metas = { presenca: 70, falta: 20, cancelamento: 10 };

export const MAPEAMENTO_PADRAO: MapeamentoStatus = {
  presenca: ["presenca", "presença", "presente", "compareceu", "ok", "efetivado"],
  falta: ["falta", "faltou", "nao compareceu", "não compareceu", "ausente", "no show"],
  cancelamento: ["cancelamento", "cancelado", "cancelada", "desistiu", "cancel"],
};

export function normalizarTexto(valor: unknown): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function resolverStatus(
  bruto: unknown,
  mapa: MapeamentoStatus = MAPEAMENTO_PADRAO,
): StatusVaga | null {
  const v = normalizarTexto(bruto);
  if (!v) return null;
  const casa = (lista: string[]) =>
    lista.some((item) => {
      const n = normalizarTexto(item);
      return n.length > 0 && (v === n || v.includes(n));
    });
  if (casa(mapa.cancelamento)) return "CANCELAMENTO";
  if (casa(mapa.falta)) return "FALTA";
  if (casa(mapa.presenca)) return "PRESENCA";
  return null;
}
