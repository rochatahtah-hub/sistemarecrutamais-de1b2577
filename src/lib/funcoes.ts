import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface Funcao {
  id: string;
  nome: string;
  ativo: boolean;
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
        .select("id,nome,ativo")
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
    mutationFn: async (dados: { id?: string; nome?: string; ativo?: boolean }) => {
      const campos: { nome?: string; ativo?: boolean } = {};
      if (dados.nome !== undefined) {
        const nome = normalizarNomeFuncao(dados.nome);
        if (nome.length < 2) throw new Error("Informe o nome da função.");
        campos.nome = nome;
      }
      if (dados.ativo !== undefined) campos.ativo = dados.ativo;

      const resposta = dados.id
        ? await supabase.from("funcoes").update(campos).eq("id", dados.id)
        : await supabase.from("funcoes").insert({ nome: campos.nome ?? "", ativo: campos.ativo ?? true });
      if (resposta.error) {
        if (resposta.error.code === "23505") throw new Error("Essa função já está cadastrada.");
        throw resposta.error;
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["funcoes"] }),
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
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["funcoes"] }),
  });
}

