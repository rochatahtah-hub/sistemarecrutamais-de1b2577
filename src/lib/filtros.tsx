import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { VagaRegistro } from "./tipos";
import { normalizarTexto } from "./tipos";
import { criarResolucaoProgramadora } from "./metricas";
import { useProgramadorasHabilitadas } from "./programacao";

export interface EstadoFiltros {
  dataInicio: string;
  dataFim: string;
  mes: string;
  ano: string;
  quinzena: "todas" | "1" | "2";
  colaborador: string;
  empresa: string;
  status: string;
  busca: string;
}

export const FILTROS_INICIAIS: EstadoFiltros = {
  dataInicio: "",
  dataFim: "",
  mes: "todos",
  ano: "todos",
  quinzena: "todas",
  colaborador: "todos",
  empresa: "todas",
  status: "todos",
  busca: "",
};

interface Ctx {
  filtros: EstadoFiltros;
  setFiltros: (f: Partial<EstadoFiltros>) => void;
  limpar: () => void;
  /** Programadoras ativas com acesso efetivo a "Minha Programação" (fonte: banco). */
  programadoras: { id: string; nome: string }[];
  /** Aplica os filtros atuais, resolvendo o colaborador pelo ID da programadora. */
  filtrar: (registros: VagaRegistro[]) => VagaRegistro[];
}

const FiltrosContext = createContext<Ctx | null>(null);

export function FiltrosProvider({ children }: { children: ReactNode }) {
  const [filtros, setEstado] = useState<EstadoFiltros>(FILTROS_INICIAIS);
  const { data: programadoras = [] } = useProgramadorasHabilitadas();
  const resolver = useMemo(() => criarResolucaoProgramadora(programadoras), [programadoras]);
  const valor = useMemo<Ctx>(
    () => ({
      filtros,
      setFiltros: (parcial) => setEstado((atual) => ({ ...atual, ...parcial })),
      limpar: () => setEstado(FILTROS_INICIAIS),
      programadoras,
      filtrar: (registros) => aplicarFiltros(registros, filtros, resolver),
    }),
    [filtros, programadoras, resolver],
  );
  return <FiltrosContext.Provider value={valor}>{children}</FiltrosContext.Provider>;
}

export function useFiltros() {
  const ctx = useContext(FiltrosContext);
  if (!ctx) throw new Error("useFiltros precisa estar dentro de FiltrosProvider");
  return ctx;
}

export function aplicarFiltros(
  registros: VagaRegistro[],
  f: EstadoFiltros,
  resolverProgramadora?: (r: VagaRegistro) => string | undefined,
): VagaRegistro[] {
  const busca = normalizarTexto(f.busca);
  return registros.filter((r) => {
    if (f.dataInicio && r.data < f.dataInicio) return false;
    if (f.dataFim && r.data > f.dataFim) return false;
    const partes = r.data.split("-");
    const ano = partes[0] ?? "";
    const mes = partes[1] ?? "";
    const dia = Number(partes[2] ?? "1");
    if (f.ano !== "todos" && ano !== f.ano) return false;
    if (f.mes !== "todos" && mes !== f.mes) return false;
    if (f.quinzena === "1" && dia > 15) return false;
    if (f.quinzena === "2" && dia <= 15) return false;
    if (f.colaborador !== "todos") {
      // o filtro guarda o ID da programadora; nome nunca é identificador
      const id = resolverProgramadora?.(r);
      if (id !== f.colaborador) return false;
    }
    if (f.empresa !== "todas" && r.empresa !== f.empresa) return false;
    if (f.status !== "todos" && r.status !== f.status) return false;
    if (busca) {
      const alvo = normalizarTexto(`${r.colaborador} ${r.empresa} ${r.descricao} ${r.observacao}`);
      if (!alvo.includes(busca)) return false;
    }
    return true;
  });
}

export function descreverPeriodo(registros: VagaRegistro[]): string {
  if (registros.length === 0) return "Sem registros";
  const datas = registros.map((r) => r.data).sort();
  const fmt = (iso: string) => iso.split("-").reverse().join("/");
  return `${fmt(datas[0]!)} a ${fmt(datas[datas.length - 1]!)}`;
}