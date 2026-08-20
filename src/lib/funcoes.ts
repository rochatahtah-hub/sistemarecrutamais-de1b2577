import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface Funcao {
  id: string;
  nome: string;
  ativo: boolean;
  descricao: string;
  perfil_id: string | null;
}

/** Normaliza o nome da função: sem espaços duplicados e sempre em caixa alta. */
export function normalizarNomeFuncao(nome: string) {
  return (nome ?? "").replace(/\s+/g, " ").trim().toUpperCase().slice(0, 80);
}

/** Funções/cargos cadastrados no banco (fonte única — nada fixo no código). */
export function useFuncoes() {
  const { user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryKey: ["funcoes"],
    staleTime: 30_000,
    queryFn: async (): Promise<Funcao[]> => {
      const { data, error } = await supabase
        .from("funcoes")
        .select("id,nome,ativo,descricao,perfil_id")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Opções para os campos de seleção: apenas funções ativas, mais o valor
 * histórico já gravado no registro (mesmo que a função tenha sido inativada).
 */
export function opcoesFuncao(funcoes: Funcao[], valorAtual?: string | null) {
  const ativas = funcoes.filter((f) => f.ativo).map((f) => f.nome);
  const atual = (valorAtual ?? "").trim();
  if (atual && !ativas.includes(atual)) return [atual, ...ativas];
  return ativas;
}

export function useSalvarFuncao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: {
      id?: string;
      nome?: string;
      ativo?: boolean;
      descricao?: string;
    }) => {
      const campos: { nome?: string; ativo?: boolean; descricao?: string } = {};
      if (dados.nome !== undefined) {
        const nome = normalizarNomeFuncao(dados.nome);
        if (nome.length < 2) throw new Error("Informe o nome da função.");
        campos.nome = nome;
      }
      if (dados.ativo !== undefined) campos.ativo = dados.ativo;
      if (dados.descricao !== undefined) campos.descricao = dados.descricao.trim().slice(0, 200);

      const resposta = dados.id
        ? await supabase.from("funcoes").update(campos).eq("id", dados.id)
        : await supabase.from("funcoes").insert({
            nome: campos.nome ?? "",
            ativo: campos.ativo ?? true,
            descricao: campos.descricao ?? "",
          });
      if (resposta.error) {
        if (resposta.error.code === "23505") throw new Error("Essa função já está cadastrada.");
        throw resposta.error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["funcoes"] });
      void qc.invalidateQueries({ queryKey: ["perfis-acesso"] });
    },
  });
}

/** Função da equipe vinculada a cada colaborador com acesso ao sistema. */
export function useFuncoesDosUsuarios() {
  const { user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryKey: ["funcoes-usuarios"],
    staleTime: 30_000,
    queryFn: async (): Promise<Record<string, string | null>> => {
      const { data, error } = await supabase.from("profiles").select("id,funcao_id");
      if (error) throw error;
      const mapa: Record<string, string | null> = {};
      for (const p of data ?? []) mapa[p.id] = p.funcao_id ?? null;
      return mapa;
    },
  });
}

/** Vincula (ou remove) a função da equipe de um colaborador. */
export function useDefinirFuncaoDoUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { userId: string; funcaoId: string | null }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ funcao_id: p.funcaoId })
        .eq("id", p.userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["funcoes-usuarios"] });
      void qc.invalidateQueries({ queryKey: ["usuarios-permissao"] });
    },
  });
}

/** Exclui uma função da equipe. Use a inativação quando quiser manter histórico. */
export function useExcluirFuncao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("funcoes").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["funcoes"] });
      void qc.invalidateQueries({ queryKey: ["perfis-acesso"] });
    },
  });
}

