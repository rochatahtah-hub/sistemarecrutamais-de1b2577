import type { Metas, VagaRegistro } from "./tipos";

export interface Agregado {
  vagas: number;
  presencas: number;
  faltas: number;
  cancelamentos: number;
  pctPresenca: number;
  pctFalta: number;
  pctCancelamento: number;
}

export const AGREGADO_ZERO: Agregado = {
  vagas: 0,
  presencas: 0,
  faltas: 0,
  cancelamentos: 0,
  pctPresenca: 0,
  pctFalta: 0,
  pctCancelamento: 0,
};

function pct(parte: number, total: number) {
  if (!total || total <= 0) return 0;
  return (parte / total) * 100;
}

export function agregar(registros: VagaRegistro[]): Agregado {
  let vagas = 0;
  let presencas = 0;
  let faltas = 0;
  let cancelamentos = 0;
  for (const r of registros) {
    const q = Number.isFinite(r.quantidade) ? r.quantidade : 0;
    vagas += q;
    if (r.status === "PRESENCA") presencas += q;
    else if (r.status === "FALTA") faltas += q;
    else if (r.status === "CANCELAMENTO") cancelamentos += q;
  }
  return {
    vagas,
    presencas,
    faltas,
    cancelamentos,
    pctPresenca: pct(presencas, vagas),
    pctFalta: pct(faltas, vagas),
    pctCancelamento: pct(cancelamentos, vagas),
  };
}

export interface LinhaAgregada extends Agregado {
  chave: string;
  nome: string;
}

export function agregarPor(
  registros: VagaRegistro[],
  campo: "colaborador" | "empresa",
): LinhaAgregada[] {
  const grupos = new Map<string, VagaRegistro[]>();
  for (const r of registros) {
    const nome = (campo === "colaborador" ? r.colaborador : r.empresa) || "Não identificado";
    const lista = grupos.get(nome);
    if (lista) lista.push(r);
    else grupos.set(nome, [r]);
  }
  return Array.from(grupos.entries())
    .map(([nome, lista]) => ({ chave: nome, nome, ...agregar(lista) }))
    .sort((a, b) => b.vagas - a.vagas);
}

export type Granularidade = "dia" | "semana" | "quinzena" | "mes";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function chavePeriodo(dataISO: string, granularidade: Granularidade): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  if (granularidade === "dia") return dataISO;
  if (granularidade === "mes") return `${ano}-${pad(mes)}`;
  if (granularidade === "quinzena") return `${ano}-${pad(mes)}-${dia <= 15 ? "Q1" : "Q2"}`;
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  const diaSemana = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - diaSemana);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function rotuloPeriodo(chave: string, granularidade: Granularidade): string {
  if (granularidade === "mes") {
    const [ano, mes] = chave.split("-");
    return `${mes}/${ano}`;
  }
  if (granularidade === "quinzena") {
    const [ano, mes, q] = chave.split("-");
    return `${q === "Q1" ? "1ª" : "2ª"} quinz. ${mes}/${ano}`;
  }
  const [, mes, dia] = chave.split("-");
  return granularidade === "semana" ? `sem. ${dia}/${mes}` : `${dia}/${mes}`;
}

export function serieTemporal(registros: VagaRegistro[], granularidade: Granularidade) {
  const grupos = new Map<string, VagaRegistro[]>();
  for (const r of registros) {
    const k = chavePeriodo(r.data, granularidade);
    const lista = grupos.get(k);
    if (lista) lista.push(r);
    else grupos.set(k, [r]);
  }
  return Array.from(grupos.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([chave, lista]) => {
      const a = agregar(lista);
      return { chave, periodo: rotuloPeriodo(chave, granularidade), ...a };
    });
}

export function variacao(atual: number, anterior: number): number {
  if (!anterior) return atual > 0 ? 100 : 0;
  return ((atual - anterior) / anterior) * 100;
}

export interface Alerta {
  tipo: "empresa" | "colaborador" | "tendencia";
  severidade: "critico" | "atencao";
  titulo: string;
  descricao: string;
}

export function gerarAlertas(registros: VagaRegistro[], metas: Metas): Alerta[] {
  const alertas: Alerta[] = [];
  const minimoVagas = 5;

  for (const e of agregarPor(registros, "empresa")) {
    if (e.vagas < minimoVagas) continue;
    if (e.pctPresenca < metas.presenca) {
      alertas.push({
        tipo: "empresa",
        severidade: e.pctPresenca < metas.presenca - 15 ? "critico" : "atencao",
        titulo: `${e.nome} abaixo da meta de presença`,
        descricao: `${e.pctPresenca.toFixed(1)}% de presença (meta ${metas.presenca}%) — ${e.presencas} de ${e.vagas} vagas.`,
      });
    }
    if (e.pctFalta > metas.falta) {
      alertas.push({
        tipo: "empresa",
        severidade: e.pctFalta > metas.falta + 15 ? "critico" : "atencao",
        titulo: `${e.nome} com faltas acima da meta`,
        descricao: `${e.pctFalta.toFixed(1)}% de faltas (meta máx. ${metas.falta}%) — ${e.faltas} faltas em ${e.vagas} vagas.`,
      });
    }
    if (e.pctCancelamento > metas.cancelamento) {
      alertas.push({
        tipo: "empresa",
        severidade: "atencao",
        titulo: `${e.nome} com cancelamentos acima da meta`,
        descricao: `${e.pctCancelamento.toFixed(1)}% de cancelamentos (meta máx. ${metas.cancelamento}%) — ${e.cancelamentos} de ${e.vagas}.`,
      });
    }
  }

  for (const c of agregarPor(registros, "colaborador")) {
    if (c.vagas < minimoVagas) continue;
    if (c.pctPresenca < metas.presenca) {
      alertas.push({
        tipo: "colaborador",
        severidade: c.pctPresenca < metas.presenca - 15 ? "critico" : "atencao",
        titulo: `${c.nome} abaixo da meta de presença`,
        descricao: `${c.pctPresenca.toFixed(1)}% de presença em ${c.vagas} vagas (meta ${metas.presenca}%).`,
      });
    }
  }

  const serie = serieTemporal(registros, "quinzena");
  if (serie.length >= 2) {
    const atual = serie[serie.length - 1]!;
    const anterior = serie[serie.length - 2]!;
    const varFaltas = variacao(atual.faltas, anterior.faltas);
    const varPresenca = atual.pctPresenca - anterior.pctPresenca;
    if (varFaltas >= 20) {
      alertas.push({
        tipo: "tendencia",
        severidade: "critico",
        titulo: "Aumento significativo de faltas",
        descricao: `Faltas subiram ${varFaltas.toFixed(1)}% de ${anterior.periodo} para ${atual.periodo}.`,
      });
    }
    if (varPresenca <= -5) {
      alertas.push({
        tipo: "tendencia",
        severidade: "atencao",
        titulo: "Queda na taxa de presença",
        descricao: `Presença caiu ${Math.abs(varPresenca).toFixed(1)} pontos percentuais em relação a ${anterior.periodo}.`,
      });
    }
    if (variacao(atual.cancelamentos, anterior.cancelamentos) >= 20) {
      alertas.push({
        tipo: "tendencia",
        severidade: "atencao",
        titulo: "Aumento de cancelamentos",
        descricao: `Cancelamentos subiram em relação a ${anterior.periodo}.`,
      });
    }
  }

  const ordem = { critico: 0, atencao: 1 };
  return alertas.sort((a, b) => ordem[a.severidade] - ordem[b.severidade]);
}

export function fmtNum(n: number) {
  return new Intl.NumberFormat("pt-BR").format(Math.round(n));
}

export function fmtPct(n: number) {
  return `${n.toFixed(1).replace(".", ",")}%`;
}

export function fmtData(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}