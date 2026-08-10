import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export interface RegistroAuditoria {
  id: string;
  tabela: string;
  registro_id: string | null;
  acao: string;
  descricao: string;
  campo: string;
  valor_anterior: string;
  valor_novo: string;
  usuario_nome: string;
  created_at: string;
}

export const TABELA_LABEL: Record<string, string> = {
  vagas: "Vaga",
  candidatos: "Candidato",
  empresas: "Empresa",
  colaboradores: "Colaborador",
  colaboradores_bloqueados: "Bloqueio",
};

export const ACAO_LABEL: Record<string, string> = {
  INSERT: "Criação",
  UPDATE: "Alteração",
  DELETE: "Exclusão",
};

/** Histórico de alterações: quem, quando, o que mudou e valores antes/depois. */
export function useAuditoria(limite = 500) {
  return useQuery({
    queryKey: ["auditoria", limite],
    staleTime: 15_000,
    queryFn: async (): Promise<RegistroAuditoria[]> => {
      const { data, error } = await supabase
        .from("auditoria")
        .select(
          "id,tabela,registro_id,acao,descricao,campo,valor_anterior,valor_novo,usuario_nome,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(limite);
      if (error) throw error;
      return (data ?? []) as RegistroAuditoria[];
    },
  });
}
