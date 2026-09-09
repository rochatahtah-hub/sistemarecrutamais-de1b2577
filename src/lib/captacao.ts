import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { formatarResumoVaga } from "@/lib/tipos";

export const BUCKET_CURRICULOS = "curriculos";

export type ModalidadeCaptacao = "diarias" | "especifica" | "clt";

export const MODALIDADE_ROTULO: Record<ModalidadeCaptacao, string> = {
  diarias: "DIÁRIAS",
  especifica: "DIÁRIAS SELECIONADAS",
  clt: "VAGAS CLT",
};

export const MODALIDADE_DESCRICAO: Record<ModalidadeCaptacao, string> = {
  diarias: "Encontre diárias abertas",
  especifica: "Escolha uma diária selecionada",
  clt: "Encontre oportunidades efetivas",
};

export const FRASE_INSTITUCIONAL = "Grandes talentos começam aqui.";

export interface ConfigCaptacao {
  id?: string;
  diarias_ativa: boolean;
  oportunidades_ativa: boolean;
  clt_ativa: boolean;
}

export const CONFIG_PADRAO: ConfigCaptacao = {
  diarias_ativa: true,
  oportunidades_ativa: false,
  clt_ativa: false,
};

export interface VagaResumo {
  genero: string | null;
  cidade: string | null;
  bairro: string | null;
  horario_inicio: string | null;
  horario_fim: string | null;
  intervalo_inicio: string | null;
  intervalo_fim: string | null;
  transporte_tipo: string | null;
  transporte_detalhes: string | null;
}

export interface Oportunidade {
  id: string;
  modalidade: "especifica" | "clt";
  vaga_id: string | null;
  titulo: string;
  data_oportunidade: string | null;
  descricao: string;
  requisitos: string;
  informacoes_adicionais: string;
  curriculo_obrigatorio: boolean;
  status: "ativa" | "arquivada";
  created_at: string;
  genero: string | null;
  cidade: string | null;
  bairro: string | null;
  horario_inicio: string | null;
  horario_fim: string | null;
  intervalo_inicio: string | null;
  intervalo_fim: string | null;
  transporte_tipo: string | null;
  transporte_detalhes: string | null;
  /** Condições da vaga vinculada, usadas só como respaldo quando a própria oportunidade não tem o campo preenchido. */
  vaga: VagaResumo | null;
}

/**
 * Resumo pronto pra exibir: usa os dados preenchidos na própria oportunidade
 * e só recorre à vaga vinculada como respaldo (ex.: oportunidades antigas,
 * criadas antes desses campos existirem aqui).
 */
export function resumoOportunidade(o: {
  genero: string | null;
  cidade: string | null;
  bairro: string | null;
  horario_inicio: string | null;
  horario_fim: string | null;
  transporte_tipo: string | null;
  transporte_detalhes: string | null;
  vaga?: {
    genero: string | null;
    cidade: string | null;
    bairro: string | null;
    horario_inicio: string | null;
    horario_fim: string | null;
    transporte_tipo: string | null;
    transporte_detalhes: string | null;
  } | null;
}): string[] {
  return formatarResumoVaga({
    genero: o.genero ?? o.vaga?.genero ?? null,
    cidade: o.cidade ?? o.vaga?.cidade ?? null,
    bairro: o.bairro ?? o.vaga?.bairro ?? null,
    horario_inicio: o.horario_inicio ?? o.vaga?.horario_inicio ?? null,
    horario_fim: o.horario_fim ?? o.vaga?.horario_fim ?? null,
    transporte_tipo: o.transporte_tipo ?? o.vaga?.transporte_tipo ?? null,
    transporte_detalhes: o.transporte_detalhes ?? o.vaga?.transporte_detalhes ?? null,
  });
}

export interface Candidatura {
  id: string;
  oportunidade_id: string;
  daily_worker_id: string | null;
  nome: string;
  cpf: string;
  telefone: string;
  curriculo_path: string;
  curriculo_nome: string;
  status: "ativa" | "arquivada";
  created_at: string;
}

const CAMPOS_OPORTUNIDADE =
  "id,modalidade,vaga_id,titulo,data_oportunidade,descricao,requisitos,informacoes_adicionais,curriculo_obrigatorio,status,created_at," +
  "genero,cidade,bairro,horario_inicio,horario_fim,intervalo_inicio,intervalo_fim,transporte_tipo,transporte_detalhes," +
  "vaga:vagas(genero,cidade,bairro,horario_inicio,horario_fim,intervalo_inicio,intervalo_fim,transporte_tipo,transporte_detalhes)";

/** Configuração de modalidades da empresa atual (o banco isola por empresa). */
export function useConfigCaptacao() {
  return useQuery({
    queryKey: ["captacao-config"],
    queryFn: async (): Promise<ConfigCaptacao> => {
      const { data, error } = await supabase
        .from("captacao_config")
        .select("id,diarias_ativa,oportunidades_ativa,clt_ativa")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as ConfigCaptacao | null) ?? CONFIG_PADRAO;
    },
  });
}

export function useSalvarConfigCaptacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: ConfigCaptacao) => {
      if (dados.id) {
        const { error } = await supabase
          .from("captacao_config")
          .update({
            diarias_ativa: dados.diarias_ativa,
            oportunidades_ativa: dados.oportunidades_ativa,
            clt_ativa: dados.clt_ativa,
          })
          .eq("id", dados.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("captacao_config").insert({
        diarias_ativa: dados.diarias_ativa,
        oportunidades_ativa: dados.oportunidades_ativa,
        clt_ativa: dados.clt_ativa,
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["captacao-config"] }),
  });
}

/** Postgres devolve "HH:MM:SS" — corta pra "HH:MM" (formato do input/exibição). */
function sliceHora(v: string | null | undefined): string | null {
  return v ? v.slice(0, 5) : null;
}

function normalizarOportunidade(o: Oportunidade): Oportunidade {
  return {
    ...o,
    horario_inicio: sliceHora(o.horario_inicio),
    horario_fim: sliceHora(o.horario_fim),
    intervalo_inicio: sliceHora(o.intervalo_inicio),
    intervalo_fim: sliceHora(o.intervalo_fim),
    vaga: o.vaga
      ? {
          ...o.vaga,
          horario_inicio: sliceHora(o.vaga.horario_inicio),
          horario_fim: sliceHora(o.vaga.horario_fim),
          intervalo_inicio: sliceHora(o.vaga.intervalo_inicio),
          intervalo_fim: sliceHora(o.vaga.intervalo_fim),
        }
      : null,
  };
}

export function useOportunidades(modalidade: "especifica" | "clt", status: "ativa" | "arquivada") {
  return useQuery({
    queryKey: ["captacao-oportunidades", modalidade, status],
    queryFn: async (): Promise<Oportunidade[]> => {
      const { data, error } = await supabase
        .from("captacao_oportunidades")
        .select(CAMPOS_OPORTUNIDADE)
        .eq("modalidade", modalidade)
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return ((data ?? []) as unknown as Oportunidade[]).map(normalizarOportunidade);
    },
  });
}

/** Quantidade de cadastros ativos por oportunidade. */
export function useContagemCandidaturas() {
  return useQuery({
    queryKey: ["captacao-contagem"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("captacao_candidaturas")
        .select("oportunidade_id,status")
        .limit(5000);
      if (error) throw error;
      const mapa = new Map<string, number>();
      for (const linha of data ?? []) {
        if (linha.status !== "ativa") continue;
        mapa.set(linha.oportunidade_id, (mapa.get(linha.oportunidade_id) ?? 0) + 1);
      }
      return mapa;
    },
  });
}

export interface DadosOportunidade {
  id?: string;
  modalidade: "especifica" | "clt";
  vaga_id: string | null;
  titulo: string;
  data_oportunidade: string | null;
  descricao: string;
  requisitos: string;
  informacoes_adicionais: string;
  curriculo_obrigatorio: boolean;
  genero: string;
  cidade: string;
  bairro: string;
  horario_inicio: string;
  horario_fim: string;
  intervalo_inicio: string;
  intervalo_fim: string;
  transporte_tipo: string;
  transporte_detalhes: string;
}

function invalidarCaptacao(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["captacao-oportunidades"] });
  void qc.invalidateQueries({ queryKey: ["captacao-candidaturas"] });
  void qc.invalidateQueries({ queryKey: ["captacao-contagem"] });
}

export function useSalvarOportunidade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: DadosOportunidade) => {
      const registro = {
        modalidade: dados.modalidade,
        vaga_id: dados.vaga_id,
        titulo: dados.titulo.trim().slice(0, 160),
        data_oportunidade: dados.data_oportunidade || null,
        descricao: dados.descricao.trim(),
        requisitos: dados.requisitos.trim(),
        informacoes_adicionais: dados.informacoes_adicionais.trim(),
        curriculo_obrigatorio: dados.curriculo_obrigatorio,
        genero: dados.genero || null,
        cidade: dados.cidade.trim() || null,
        bairro: dados.bairro.trim() || null,
        horario_inicio: dados.horario_inicio || null,
        horario_fim: dados.horario_fim || null,
        intervalo_inicio: dados.intervalo_inicio || null,
        intervalo_fim: dados.intervalo_fim || null,
        transporte_tipo: dados.transporte_tipo || null,
        transporte_detalhes: dados.transporte_tipo === "FRETADO" ? dados.transporte_detalhes.trim() || null : null,
      };
      if (dados.id) {
        const { error } = await supabase
          .from("captacao_oportunidades")
          .update(registro)
          .eq("id", dados.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("captacao_oportunidades").insert(registro);
      if (error) throw error;
    },
    onSuccess: () => invalidarCaptacao(qc),
  });
}

/** Arquivar preserva tudo: apenas impede novos cadastros e some do portal. */
export function useArquivarOportunidade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("captacao_oportunidades")
        .update({ status: "arquivada", arquivada_em: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      const { error: erroCad } = await supabase
        .from("captacao_candidaturas")
        .update({ status: "arquivada" })
        .eq("oportunidade_id", id)
        .eq("status", "ativa");
      if (erroCad) throw erroCad;
    },
    onSuccess: () => invalidarCaptacao(qc),
  });
}

export function useRestaurarOportunidade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, comCadastros }: { id: string; comCadastros: boolean }) => {
      const { error } = await supabase
        .from("captacao_oportunidades")
        .update({ status: "ativa", arquivada_em: null })
        .eq("id", id);
      if (error) throw error;
      if (!comCadastros) return;
      const { error: erroCad } = await supabase
        .from("captacao_candidaturas")
        .update({ status: "ativa" })
        .eq("oportunidade_id", id)
        .eq("status", "arquivada");
      if (erroCad) throw erroCad;
    },
    onSuccess: () => invalidarCaptacao(qc),
  });
}

export function useCandidaturas(oportunidadeId: string | null) {
  return useQuery({
    queryKey: ["captacao-candidaturas", oportunidadeId],
    enabled: Boolean(oportunidadeId),
    queryFn: async (): Promise<Candidatura[]> => {
      const { data, error } = await supabase
        .from("captacao_candidaturas")
        .select(
          "id,oportunidade_id,daily_worker_id,nome,cpf,telefone,curriculo_path,curriculo_nome,status,created_at",
        )
        .eq("oportunidade_id", oportunidadeId!)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as Candidatura[];
    },
  });
}

/** Exclui somente a candidatura escolhida — o colaborador e as demais permanecem. */
export function useExcluirCandidatura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("captacao_candidaturas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidarCaptacao(qc),
  });
}

/** Link temporário para ver o currículo (nunca há URL pública). */
export async function urlCurriculo(caminho: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET_CURRICULOS)
    .createSignedUrl(caminho, 300);
  if (error) throw error;
  return data.signedUrl;
}

/** Vagas já existentes no sistema, para vincular à oportunidade. */
export function useVagasParaCaptacao() {
  return useQuery({
    queryKey: ["captacao-vagas"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vagas")
        .select("id,data,cargo,descricao,empresas(nome),genero,cidade,bairro,horario_inicio,horario_fim,transporte_tipo")
        .order("data", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((v) => {
        const empresa = (v as { empresas?: { nome?: string } | null }).empresas;
        return {
          id: v.id as string,
          data: v.data as string,
          cargo: (v.cargo as string) || (v.descricao as string) || "Vaga",
          empresa: empresa?.nome ?? "",
          genero: v.genero as string | null,
          cidade: v.cidade as string | null,
          bairro: v.bairro as string | null,
          horario_inicio: v.horario_inicio ? (v.horario_inicio as string).slice(0, 5) : null,
          horario_fim: v.horario_fim ? (v.horario_fim as string).slice(0, 5) : null,
          transporte_tipo: v.transporte_tipo as string | null,
        };
      });
    },
  });
}
