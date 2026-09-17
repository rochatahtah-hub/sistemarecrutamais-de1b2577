import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import {
  reprocessarLevantamentoDiario,
  salvarConfigLevantamentoDiario,
} from "./levantamento-diario.functions";
import { consolidarQuinzena, type QuinzenaConsolidada } from "./levantamento-quinzena";

export interface LevantamentoDiarioResumo {
  id: string;
  dataReferencia: string;
  vagasFechadas: number;
  pendentes: number;
  presencas: number;
  faltas: number;
  cancelamentos: number;
  pctPresenca: number;
  pctFalta: number;
  pctCancelamento: number;
  origem: string;
  geradoEm: string;
  reprocessadoEm: string | null;
  reprocessadoPorNome: string;
  vezesReprocessado: number;
}

export interface LevantamentoDiarioProgramador {
  id: string;
  programadoraId: string;
  nome: string;
  vagasFechadas: number;
  pendentes: number;
  presencas: number;
  faltas: number;
  cancelamentos: number;
  pctPresenca: number;
  pctFalta: number;
  pctCancelamento: number;
  vagaIds: string[];
}

export interface VagaDoLevantamento {
  id: string;
  dataProgramada: string;
  cargo: string;
  status: string;
  dataFechamento: string | null;
  colaborador: string;
  empresa: string;
}

type LinhaResumo = {
  id: string;
  data_referencia: string;
  vagas_fechadas: number;
  pendentes: number;
  presencas: number;
  faltas: number;
  cancelamentos: number;
  pct_presenca: number;
  pct_falta: number;
  pct_cancelamento: number;
  origem: string;
  gerado_em: string;
  reprocessado_em: string | null;
  reprocessado_por_nome: string;
  vezes_reprocessado: number;
};

type LinhaProgramador = {
  id: string;
  programadora_id: string;
  programadora_nome: string;
  vagas_fechadas: number;
  pendentes: number;
  presencas: number;
  faltas: number;
  cancelamentos: number;
  pct_presenca: number;
  pct_falta: number;
  pct_cancelamento: number;
  vaga_ids: string[];
};

function mapearResumo(r: LinhaResumo): LevantamentoDiarioResumo {
  return {
    id: r.id,
    dataReferencia: r.data_referencia,
    vagasFechadas: r.vagas_fechadas,
    pendentes: r.pendentes,
    presencas: r.presencas,
    faltas: r.faltas,
    cancelamentos: r.cancelamentos,
    pctPresenca: r.pct_presenca,
    pctFalta: r.pct_falta,
    pctCancelamento: r.pct_cancelamento,
    origem: r.origem,
    geradoEm: r.gerado_em,
    reprocessadoEm: r.reprocessado_em,
    reprocessadoPorNome: r.reprocessado_por_nome,
    vezesReprocessado: r.vezes_reprocessado,
  };
}

function mapearProgramador(r: LinhaProgramador): LevantamentoDiarioProgramador {
  return {
    id: r.id,
    programadoraId: r.programadora_id,
    nome: r.programadora_nome,
    vagasFechadas: r.vagas_fechadas,
    pendentes: r.pendentes,
    presencas: r.presencas,
    faltas: r.faltas,
    cancelamentos: r.cancelamentos,
    pctPresenca: r.pct_presenca,
    pctFalta: r.pct_falta,
    pctCancelamento: r.pct_cancelamento,
    vagaIds: r.vaga_ids,
  };
}

/** Levantamento de uma data específica (resumo + detalhe por programador). `null` quando ainda não foi gerado. */
export function useLevantamentoDiario(dataReferencia: string) {
  return useQuery({
    queryKey: ["levantamento-diario", dataReferencia],
    enabled: Boolean(dataReferencia),
    queryFn: async () => {
      const { data: resumo, error } = await supabase
        .from("levantamentos_diarios")
        .select("*")
        .eq("data_referencia", dataReferencia)
        .maybeSingle();
      if (error) throw error;
      if (!resumo) return null;

      const { data: linhas, error: erroLinhas } = await supabase
        .from("levantamento_diario_programadores")
        .select("*")
        .eq("levantamento_id", resumo.id)
        .order("vagas_fechadas", { ascending: false });
      if (erroLinhas) throw erroLinhas;

      return {
        resumo: mapearResumo(resumo),
        porProgramador: (linhas ?? []).map(mapearProgramador),
      };
    },
  });
}

/**
 * Consolidação de uma quinzena a partir dos levantamentos diários já gravados
 * no período. Só leitura: nunca gera, reprocessa nem grava nada — se um dia do
 * intervalo ainda não foi gerado, ele simplesmente não entra na soma.
 */
export function useLevantamentoQuinzena(periodo: { inicio: string; fim: string }) {
  return useQuery({
    queryKey: ["levantamento-quinzena", periodo.inicio, periodo.fim],
    enabled: Boolean(periodo.inicio && periodo.fim),
    queryFn: async (): Promise<QuinzenaConsolidada> => {
      const { data: dias, error } = await supabase
        .from("levantamentos_diarios")
        .select("id,data_referencia")
        .gte("data_referencia", periodo.inicio)
        .lte("data_referencia", periodo.fim)
        .order("data_referencia");
      if (error) throw error;

      const porId = new Map((dias ?? []).map((d) => [d.id, d.data_referencia]));
      if (porId.size === 0) return consolidarQuinzena([], periodo);

      const { data: linhas, error: erroLinhas } = await supabase
        .from("levantamento_diario_programadores")
        .select(
          "levantamento_id,programadora_id,programadora_nome,vagas_fechadas,pendentes,presencas,faltas,cancelamentos",
        )
        .in("levantamento_id", Array.from(porId.keys()));
      if (erroLinhas) throw erroLinhas;

      return consolidarQuinzena(
        (linhas ?? []).map((l) => ({
          dataReferencia: porId.get(l.levantamento_id) ?? "",
          programadoraId: l.programadora_id,
          nome: l.programadora_nome,
          vagas: l.vagas_fechadas,
          pendentes: l.pendentes,
          presencas: l.presencas,
          faltas: l.faltas,
          cancelamentos: l.cancelamentos,
        })),
        periodo,
      );
    },
  });
}

/** Lista para o seletor "Levantamento de DD/MM/AAAA" — histórico nunca é apagado. */
export function useHistoricoLevantamentosDiarios() {
  return useQuery({
    queryKey: ["levantamento-diario-historico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("levantamentos_diarios")
        .select("id,data_referencia,vagas_fechadas,gerado_em,origem")
        .order("data_referencia", { ascending: false })
        .limit(365);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

/** Vagas exatas usadas no cálculo de uma linha — drill-down, mesma fonte da tabela/PDF. */
export function useDrillDownVagas(vagaIds: string[]) {
  const chave = [...vagaIds].sort().join(",");
  return useQuery({
    queryKey: ["levantamento-diario-drilldown", chave],
    enabled: vagaIds.length > 0,
    queryFn: async (): Promise<VagaDoLevantamento[]> => {
      const { data, error } = await supabase
        .from("vagas")
        .select("id,data,cargo,status,confirmado_em,colaboradores(nome),empresas(nome)")
        .in("id", vagaIds);
      if (error) throw error;
      return (data ?? []).map((v) => ({
        id: v.id,
        dataProgramada: v.data,
        cargo: v.cargo,
        status: v.status,
        dataFechamento: v.confirmado_em,
        colaborador: v.colaboradores?.nome ?? "—",
        empresa: v.empresas?.nome ?? "—",
      }));
    },
  });
}

/** Configuração do horário de geração automática (uma linha por tenant). */
export function useConfigLevantamentoDiario() {
  return useQuery({
    queryKey: ["levantamento-diario-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("levantamento_diario_config")
        .select("hora_geracao,ativo")
        .maybeSingle();
      if (error) throw error;
      return data ?? { hora_geracao: 18, ativo: true };
    },
  });
}

export function useSalvarConfigLevantamentoDiario() {
  const salvar = useServerFn(salvarConfigLevantamentoDiario);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { horaGeracao: number; ativo: boolean }) => salvar({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["levantamento-diario-config"] }),
  });
}

/** Gera (primeira vez) ou reprocessa o levantamento de uma data. */
export function useReprocessarLevantamentoDiario() {
  const reprocessar = useServerFn(reprocessarLevantamentoDiario);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dataReferencia: string) => reprocessar({ data: { dataReferencia } }),
    onSuccess: (_resultado, dataReferencia) => {
      qc.invalidateQueries({ queryKey: ["levantamento-diario", dataReferencia] });
      qc.invalidateQueries({ queryKey: ["levantamento-diario-historico"] });
    },
  });
}
