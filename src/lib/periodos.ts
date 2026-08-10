/** Atalhos de período usados no Dashboard e nas telas de inteligência. */
export type AtalhoPeriodo =
  | "hoje"
  | "ontem"
  | "semana"
  | "mes"
  | "quinzena1"
  | "quinzena2"
  | "tudo";

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const ROTULO_ATALHO: Record<AtalhoPeriodo, string> = {
  hoje: "Hoje",
  ontem: "Ontem",
  semana: "Esta semana",
  mes: "Este mês",
  quinzena1: "1ª quinzena",
  quinzena2: "2ª quinzena",
  tudo: "Tudo",
};

/** Converte o atalho em intervalo de datas (ISO) para os filtros globais. */
export function intervaloDoAtalho(atalho: AtalhoPeriodo, hoje = new Date()) {
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();

  if (atalho === "tudo") return { dataInicio: "", dataFim: "" };
  if (atalho === "hoje") return { dataInicio: iso(hoje), dataFim: iso(hoje) };
  if (atalho === "ontem") {
    const d = new Date(ano, mes, hoje.getDate() - 1);
    return { dataInicio: iso(d), dataFim: iso(d) };
  }
  if (atalho === "semana") {
    const inicio = new Date(ano, mes, hoje.getDate() - hoje.getDay());
    const fim = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6);
    return { dataInicio: iso(inicio), dataFim: iso(fim) };
  }
  if (atalho === "quinzena1") {
    return { dataInicio: iso(new Date(ano, mes, 1)), dataFim: iso(new Date(ano, mes, 15)) };
  }
  if (atalho === "quinzena2") {
    return { dataInicio: iso(new Date(ano, mes, 16)), dataFim: iso(new Date(ano, mes, ultimoDia)) };
  }
  return { dataInicio: iso(new Date(ano, mes, 1)), dataFim: iso(new Date(ano, mes, ultimoDia)) };
}