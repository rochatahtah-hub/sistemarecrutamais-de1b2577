import { agregar, type Agregado } from "./metricas";

/**
 * Consolidação quinzenal do Levantamento Diário.
 *
 * Não existe fonte de dados nova: a quinzena é apenas a soma dos levantamentos
 * diários já gravados no período. Os percentuais nunca são somados nem tirados
 * por média — são recalculados com a MESMA fórmula do diário (`agregar()`, que
 * usa presenças+faltas+cancelamentos como denominador e ignora as aguardando).
 * Nada aqui escreve no banco.
 */

export type Quinzena = 1 | 2;

/** Último dia do mês, calculado (28/29/30/31, ano bissexto incluído). */
export function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate();
}

function iso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** 1ª quinzena = dia 1 a 15. 2ª quinzena = dia 16 ao último dia do mês. */
export function periodoQuinzena(
  ano: number,
  mes: number,
  quinzena: Quinzena,
): { inicio: string; fim: string } {
  if (quinzena === 1) return { inicio: iso(ano, mes, 1), fim: iso(ano, mes, 15) };
  return { inicio: iso(ano, mes, 16), fim: iso(ano, mes, ultimoDiaDoMes(ano, mes)) };
}

/** Quinzena a que uma data pertence — usada para pré-selecionar o período. */
export function quinzenaDaData(dataIso: string): Quinzena {
  return Number(dataIso.slice(8, 10)) <= 15 ? 1 : 2;
}

/** Uma linha de programador dentro de um levantamento diário já gravado. */
export interface LinhaDiariaDoProgramador {
  dataReferencia: string;
  programadoraId: string;
  nome: string;
  vagas: number;
  pendentes: number;
  presencas: number;
  faltas: number;
  cancelamentos: number;
}

/** Quanto um dia específico contribuiu para o total do programador na quinzena. */
export interface DiaDoProgramador {
  data: string;
  vagas: number;
  pendentes: number;
  presencas: number;
  faltas: number;
  cancelamentos: number;
}

export interface LinhaQuinzenaProgramador extends Agregado {
  programadoraId: string;
  nome: string;
  /** Somente dias com dado — nunca preenche dia vazio. */
  dias: DiaDoProgramador[];
}

export interface QuinzenaConsolidada {
  inicio: string;
  fim: string;
  /** Datas de levantamento diário efetivamente encontradas no período. */
  diasComDados: string[];
  totais: Agregado;
  /** Desc por vagas. Programador sem nenhuma vaga no período nunca aparece. */
  porProgramador: LinhaQuinzenaProgramador[];
}

/** Recalcula os percentuais a partir das somas, pela fórmula única do sistema. */
function agregadoDeSomas(s: {
  pendentes: number;
  presencas: number;
  faltas: number;
  cancelamentos: number;
}): Agregado {
  return agregar([
    { status: "PRESENCA", quantidade: s.presencas },
    { status: "FALTA", quantidade: s.faltas },
    { status: "CANCELAMENTO", quantidade: s.cancelamentos },
    { status: "AGUARDANDO", quantidade: s.pendentes },
  ]);
}

/**
 * Consolida as linhas diárias do período. `linhas` já deve vir filtrada pelo
 * intervalo (a consulta faz isso no banco) — aqui nunca se filtra data.
 */
export function consolidarQuinzena(
  linhas: LinhaDiariaDoProgramador[],
  periodo: { inicio: string; fim: string },
): QuinzenaConsolidada {
  const grupos = new Map<string, LinhaDiariaDoProgramador[]>();
  for (const l of linhas) {
    const atual = grupos.get(l.programadoraId);
    if (atual) atual.push(l);
    else grupos.set(l.programadoraId, [l]);
  }

  const porProgramador = Array.from(grupos.entries())
    .map(([programadoraId, doProgramador]) => {
      const somas = doProgramador.reduce(
        (acc, l) => ({
          pendentes: acc.pendentes + l.pendentes,
          presencas: acc.presencas + l.presencas,
          faltas: acc.faltas + l.faltas,
          cancelamentos: acc.cancelamentos + l.cancelamentos,
        }),
        { pendentes: 0, presencas: 0, faltas: 0, cancelamentos: 0 },
      );
      const dias = doProgramador
        .map((l) => ({
          data: l.dataReferencia,
          vagas: l.vagas,
          pendentes: l.pendentes,
          presencas: l.presencas,
          faltas: l.faltas,
          cancelamentos: l.cancelamentos,
        }))
        .sort((a, b) => a.data.localeCompare(b.data));
      return {
        programadoraId,
        nome: doProgramador[0]?.nome ?? "",
        dias,
        ...agregadoDeSomas(somas),
        // o total vem da soma exata dos diários, nunca de recontagem
        vagas: doProgramador.reduce((s, l) => s + l.vagas, 0),
      };
    })
    .filter((l) => l.vagas > 0)
    .sort((a, b) => b.vagas - a.vagas);

  const somaGeral = linhas.reduce(
    (acc, l) => ({
      pendentes: acc.pendentes + l.pendentes,
      presencas: acc.presencas + l.presencas,
      faltas: acc.faltas + l.faltas,
      cancelamentos: acc.cancelamentos + l.cancelamentos,
    }),
    { pendentes: 0, presencas: 0, faltas: 0, cancelamentos: 0 },
  );

  return {
    inicio: periodo.inicio,
    fim: periodo.fim,
    diasComDados: Array.from(new Set(linhas.map((l) => l.dataReferencia))).sort(),
    totais: {
      ...agregadoDeSomas(somaGeral),
      vagas: linhas.reduce((s, l) => s + l.vagas, 0),
    },
    porProgramador,
  };
}

/** Os mesmos 4 rankings do diário, sempre ascendentes. */
export function rankingsQuinzena(porProgramador: LinhaQuinzenaProgramador[]) {
  const asc = <K extends keyof LinhaQuinzenaProgramador>(chave: K) =>
    [...porProgramador].sort((a, b) => (a[chave] as number) - (b[chave] as number));
  return {
    vagas: asc("vagas"),
    pctPresenca: asc("pctPresenca"),
    pctFalta: asc("pctFalta"),
    pctCancelamento: asc("pctCancelamento"),
  };
}
