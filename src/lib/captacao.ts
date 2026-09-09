import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const BUCKET_CURRICULOS = "curriculos";

export type ModalidadeCaptacao = "diarias" | "especifica" | "clt";

export const MODALIDADE_ROTULO: Record<ModalidadeCaptacao, string> = {
  diarias: "DIÁRIAS",
  especifica: "OPORTUNIDADES ESPECÍFICAS",
  clt: "VAGAS CLT",
};

export const MODALIDADE_DESCRICAO: Record<ModalidadeCaptacao, string> = {
  diarias: "Encontre diárias abertas",
  especifica: "Escolha uma oportunidade",
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
  "id,modalidade,vaga_id,titulo,data_oportunidade,descricao,requisitos,informacoes_adicionais,curriculo_obrigatorio,status,created_at";

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
      return (data ?? []) as Oportunidade[];
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
        .select("id,data,cargo,descricao,empresas(nome)")
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
        };
      });
    },
  });
}
