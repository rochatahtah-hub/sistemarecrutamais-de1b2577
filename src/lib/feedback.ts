import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/** Escopo de operação atendido pelo feedback. */
export type EscopoFeedback = "diaria" | "clt";

export type TipoFeedback =
  | "diaria_primeiro_dia"
  | "diaria_semanal"
  | "clt_entrada"
  | "clt_semanal";

export const TIPO_FEEDBACK_LABEL: Record<TipoFeedback, string> = {
  diaria_primeiro_dia: "Diária — primeiro dia",
  diaria_semanal: "Diária — semanal (equipe)",
  clt_entrada: "CLT — entrada",
  clt_semanal: "CLT — semanal (equipe)",
};

export type StatusFeedback = "PENDENTE" | "RESPONDIDO" | "CANCELADO";

export const STATUS_FEEDBACK_LABEL: Record<StatusFeedback, string> = {
  PENDENTE: "Aguardando resposta",
  RESPONDIDO: "Respondido",
  CANCELADO: "Cancelado",
};

export interface PerguntaFeedback {
  chave: string;
  titulo: string;
  opcoes: string[];
}

/** Perguntas de cada tipo de feedback (definidas na especificação do módulo). */
export const PERGUNTAS: Record<TipoFeedback, PerguntaFeedback[]> = {
  diaria_primeiro_dia: [
    { chave: "desempenho", titulo: "Como foi o desempenho?", opcoes: ["Ótimo", "Bom", "Regular", "Ruim"] },
    { chave: "horario", titulo: "Cumpriu horário?", opcoes: ["Sim", "Parcialmente", "Não"] },
    { chave: "funcao", titulo: "Conseguiu realizar a função?", opcoes: ["Sim", "Parcialmente", "Não"] },
    { chave: "manteria", titulo: "Você manteria o colaborador?", opcoes: ["Sim", "Talvez", "Não"] },
  ],
  clt_entrada: [
    { chave: "desempenho", titulo: "Como está o desempenho?", opcoes: ["Ótimo", "Bom", "Regular", "Ruim"] },
    { chave: "adaptacao", titulo: "Está se adaptando?", opcoes: ["Sim", "Parcialmente", "Não"] },
    { chave: "horario", titulo: "Está cumprindo horários?", opcoes: ["Sim", "Parcialmente", "Não"] },
    { chave: "atividades", titulo: "Está desempenhando as atividades?", opcoes: ["Sim", "Parcialmente", "Não"] },
    { chave: "continuar", titulo: "Deseja continuar com o colaborador?", opcoes: ["Sim", "Talvez", "Não"] },
  ],
  diaria_semanal: [
    { chave: "desempenho", titulo: "Como foi o desempenho da equipe nesta semana?", opcoes: ["Ótimo", "Bom", "Regular", "Ruim"] },
    { chave: "horario", titulo: "A equipe cumpriu os horários?", opcoes: ["Sim", "Parcialmente", "Não"] },
    { chave: "atividades", titulo: "As atividades foram realizadas conforme o combinado?", opcoes: ["Sim", "Parcialmente", "Não"] },
    { chave: "continuar", titulo: "Deseja manter a equipe na próxima semana?", opcoes: ["Sim", "Talvez", "Não"] },
  ],
  clt_semanal: [
    { chave: "desempenho", titulo: "Como foi o desempenho da equipe nesta semana?", opcoes: ["Ótimo", "Bom", "Regular", "Ruim"] },
    { chave: "horario", titulo: "A equipe cumpriu os horários?", opcoes: ["Sim", "Parcialmente", "Não"] },
    { chave: "atividades", titulo: "As atividades foram realizadas conforme o combinado?", opcoes: ["Sim", "Parcialmente", "Não"] },
    { chave: "continuar", titulo: "Deseja manter a equipe?", opcoes: ["Sim", "Talvez", "Não"] },
  ],
};

export function ehSemanal(tipo: TipoFeedback) {
  return tipo === "diaria_semanal" || tipo === "clt_semanal";
}

export interface ConfigFeedback {
  id: string;
  escopo: EscopoFeedback;
  empresa_id: string | null;
  rs_empresa_id: string | null;
  ativo: boolean;
  diaria_primeiro_dia: boolean;
  diaria_semanal: boolean;
  clt_entrada: boolean;
  clt_semanal: boolean;
  clt_prazo_dias: number;
  email_responsavel: string;
}

const CAMPOS_CONFIG =
  "id,escopo,empresa_id,rs_empresa_id,ativo,diaria_primeiro_dia,diaria_semanal,clt_entrada,clt_semanal,clt_prazo_dias,email_responsavel";

/** Configurações de feedback de todas as empresas da empresa ativa. */
export function useConfigsFeedback() {
  const { user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryKey: ["feedback-configs"],
    queryFn: async (): Promise<ConfigFeedback[]> => {
      const { data, error } = await supabase.from("feedback_config").select(CAMPOS_CONFIG);
      if (error) throw error;
      return (data ?? []) as ConfigFeedback[];
    },
  });
}

export interface EntradaConfigFeedback {
  escopo: EscopoFeedback;
  empresaId?: string | null;
  rsEmpresaId?: string | null;
  ativo: boolean;
  diaria_primeiro_dia: boolean;
  diaria_semanal: boolean;
  clt_entrada: boolean;
  clt_semanal: boolean;
  clt_prazo_dias: number;
  email_responsavel: string;
}

/** Cria ou atualiza a configuração de feedback de uma empresa. */
export function useSalvarConfigFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: EntradaConfigFeedback) => {
      const registro = {
        escopo: v.escopo,
        empresa_id: v.escopo === "diaria" ? (v.empresaId ?? null) : null,
        rs_empresa_id: v.escopo === "clt" ? (v.rsEmpresaId ?? null) : null,
        ativo: v.ativo,
        diaria_primeiro_dia: v.diaria_primeiro_dia,
        diaria_semanal: v.diaria_semanal,
        clt_entrada: v.clt_entrada,
        clt_semanal: v.clt_semanal,
        clt_prazo_dias: v.clt_prazo_dias,
        email_responsavel: v.email_responsavel.trim(),
      };
      const { error } = await supabase
        .from("feedback_config")
        .upsert(registro, {
          onConflict: v.escopo === "diaria" ? "empresa_id" : "rs_empresa_id",
        });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["feedback-configs"] }),
  });
}

export interface RegistroFeedback {
  id: string;
  tipo: TipoFeedback;
  escopo: EscopoFeedback;
  empresa_id: string | null;
  rs_empresa_id: string | null;
  empresa_nome: string;
  colaborador_nome: string;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  token: string;
  status: StatusFeedback;
  enviado_em: string | null;
  enviado_para: string;
  envio_status: string;
  respondido_em: string | null;
  criado_por_nome: string;
  created_at: string;
  feedback_respostas:
    | { nota: number | null; respostas: Record<string, string>; mencoes: string; observacao: string }
    | null;
}

/** Feedbacks gerados pela empresa ativa, com a resposta do cliente quando houver. */
export function useFeedbacks() {
  const { user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryKey: ["feedbacks"],
    queryFn: async (): Promise<RegistroFeedback[]> => {
      const { data, error } = await supabase
        .from("feedbacks")
        .select(
          "id,tipo,escopo,empresa_id,rs_empresa_id,empresa_nome,colaborador_nome,periodo_inicio,periodo_fim,token,status,enviado_em,enviado_para,envio_status,respondido_em,criado_por_nome,created_at,feedback_respostas(nota,respostas,mencoes,observacao)",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return ((data ?? []) as unknown as (Omit<RegistroFeedback, "feedback_respostas"> & {
        feedback_respostas: RegistroFeedback["feedback_respostas"] | RegistroFeedback["feedback_respostas"][];
      })[]).map((f) => ({
        ...f,
        feedback_respostas: Array.isArray(f.feedback_respostas)
          ? (f.feedback_respostas[0] ?? null)
          : f.feedback_respostas,
      }));
    },
  });
}

function gerarToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface NovoFeedback {
  tipo: TipoFeedback;
  escopo: EscopoFeedback;
  empresaId?: string | null;
  rsEmpresaId?: string | null;
  empresaNome: string;
  colaboradorNome?: string;
  periodoInicio?: string | null;
  periodoFim?: string | null;
}

/** Gera um novo feedback (link único) sem enviar nada ainda. */
export function useGerarFeedback() {
  const qc = useQueryClient();
  const { perfil } = useAuth();
  return useMutation({
    mutationFn: async (v: NovoFeedback) => {
      const { data, error } = await supabase
        .from("feedbacks")
        .insert({
          tipo: v.tipo,
          escopo: v.escopo,
          empresa_id: v.escopo === "diaria" ? (v.empresaId ?? null) : null,
          rs_empresa_id: v.escopo === "clt" ? (v.rsEmpresaId ?? null) : null,
          empresa_nome: v.empresaNome,
          colaborador_nome: v.colaboradorNome ?? "",
          periodo_inicio: v.periodoInicio ?? null,
          periodo_fim: v.periodoFim ?? null,
          token: gerarToken(),
          criado_por_nome: perfil?.nome ?? "",
        })
        .select("id,token")
        .single();
      if (error) {
        if (error.code === "23505")
          throw new Error("Já existe um feedback semanal para esta empresa neste período.");
        throw error;
      }
      return data as { id: string; token: string };
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["feedbacks"] }),
  });
}

/** Cancela um feedback pendente (o histórico é sempre preservado). */
export function useCancelarFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("feedbacks")
        .update({ status: "CANCELADO" })
        .eq("id", id)
        .eq("status", "PENDENTE");
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["feedbacks"] }),
  });
}
