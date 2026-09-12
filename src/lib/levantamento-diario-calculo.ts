import { agregar, criarResolucaoProgramadora, type Agregado } from "./metricas";

/** Data de hoje em America/Sao_Paulo, formato YYYY-MM-DD. */
export function hojeBrasilia(base = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(base);
}

/** Data de ontem em America/Sao_Paulo — sem horário de verão desde 2019, offset fixo. */
export function ontemBrasilia(base = new Date()): string {
  return hojeBrasilia(new Date(base.getTime() - 24 * 3_600_000));
}

/** Hora corrente (0-23) em America/Sao_Paulo. */
export function horaAtualBrasilia(base = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      hour: "numeric",
      hour12: false,
    }).format(base),
  );
}

/** Forma mínima de vaga necessária para o cálculo — vem da RPC
 * `levantamento_diario_vagas_do_dia`, já filtrada pela data de inclusão. */
export interface RegistroFechamento {
  id: string;
  quantidade: number;
  status: string;
  programadora_id: string | null;
  colaborador: string;
}

export interface LinhaLevantamentoDiario extends Agregado {
  programadoraId: string;
  nome: string;
  vagaIds: string[];
}

export interface LevantamentoDiarioCalculado {
  dataReferencia: string;
  totais: Agregado;
  /** Ordenado desc por vagas fechadas — nunca inclui programador com zero vaga. */
  porProgramador: LinhaLevantamentoDiario[];
}

/**
 * Única fonte de verdade dos números do Levantamento Diário — usada pelo job
 * automático, pelo reprocessamento manual, pelo PDF e pelo drill-down.
 * `registrosDoDia` já deve vir filtrado pela data de inclusão (nunca filtra
 * data aqui). Reaproveita `agregar()`/`criarResolucaoProgramadora()` de
 * `metricas.ts` — nunca reimplementa a fórmula de percentual.
 *
 * Diferente de `agregarPorProgramadora()` (que pré-popula toda programadora
 * habilitada, inclusive zero-vaga, para o Dashboard não "sumir" com ninguém),
 * aqui a regra é o oposto: programador sem nenhuma vaga fechada no dia nunca
 * aparece — em lugar nenhum.
 */
export function calcularLevantamentoDiario(
  registrosDoDia: RegistroFechamento[],
  dataReferencia: string,
  habilitadas: { id: string; nome: string }[],
): LevantamentoDiarioCalculado {
  const resolver = criarResolucaoProgramadora(habilitadas);
  const grupos = new Map<string, RegistroFechamento[]>();
  for (const r of registrosDoDia) {
    const id = resolver(r);
    if (!id) continue;
    const lista = grupos.get(id);
    if (lista) lista.push(r);
    else grupos.set(id, [r]);
  }

  const porId = new Map(habilitadas.map((p) => [p.id, p]));
  const porProgramador = Array.from(grupos.entries())
    .map(([id, lista]) => ({
      programadoraId: id,
      nome: porId.get(id)?.nome ?? "",
      vagaIds: lista.map((r) => r.id),
      ...agregar(lista),
    }))
    .filter((l) => l.vagas > 0)
    .sort((a, b) => b.vagas - a.vagas);

  return {
    dataReferencia,
    totais: agregar(registrosDoDia),
    porProgramador,
  };
}

/** Indica que a vaga foi adicionada no dia analisado, mas só começa depois. */
export function foraDaDataDeInicio(dataProgramada: string, dataReferencia: string): boolean {
  return dataProgramada > dataReferencia;
}

/** Os 4 rankings pedidos — sempre ascendente, sempre sem zero-vaga (já garantido acima). */
export function rankingsLevantamentoDiario(porProgramador: LinhaLevantamentoDiario[]) {
  const asc = <K extends keyof LinhaLevantamentoDiario>(chave: K) =>
    [...porProgramador].sort((a, b) => (a[chave] as number) - (b[chave] as number));
  return {
    vagasFechadas: asc("vagas"),
    pctPresenca: asc("pctPresenca"),
    pctFalta: asc("pctFalta"),
    pctCancelamento: asc("pctCancelamento"),
  };
}
