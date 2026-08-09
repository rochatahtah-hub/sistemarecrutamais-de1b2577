import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { soDigitos } from "./programacao";

export interface Bloqueio {
  id: string;
  cpf: string;
  nome: string;
  motivo: string;
  bloqueado_por_nome: string;
  created_at: string;
}

/** Consulta se um CPF está bloqueado. */
export async function buscarBloqueio(cpf: string): Promise<Bloqueio | null> {
  const limpo = soDigitos(cpf);
  if (limpo.length !== 11) return null;
  const { data, error } = await supabase
    .from("colaboradores_bloqueados")
    .select("id,cpf,nome,motivo,bloqueado_por_nome,created_at")
    .eq("cpf", limpo)
    .maybeSingle();
  if (error) throw error;
  return (data as Bloqueio | null) ?? null;
}

export function useBloqueio(cpf: string) {
  const limpo = soDigitos(cpf);
  return useQuery({
    enabled: limpo.length === 11,
    queryKey: ["bloqueio", limpo],
    queryFn: () => buscarBloqueio(limpo),
    staleTime: 10_000,
  });
}

export function useBloqueados(busca = "") {
  return useQuery({
    queryKey: ["bloqueados", busca],
    queryFn: async (): Promise<Bloqueio[]> => {
      let q = supabase
        .from("colaboradores_bloqueados")
        .select("id,cpf,nome,motivo,bloqueado_por_nome,created_at")
        .order("created_at", { ascending: false });
      const termo = busca.trim();
      if (termo) {
        const dig = soDigitos(termo);
        q = dig ? q.or(`cpf.ilike.%${dig}%,nome.ilike.%${termo}%`) : q.ilike("nome", `%${termo}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Bloqueio[];
    },
  });
}

export function useBloquearColaborador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: { cpf: string; nome: string; motivo: string }) => {
      const cpf = soDigitos(dados.cpf);
      if (cpf.length !== 11) throw new Error("Informe um CPF completo.");
      if (!dados.motivo.trim()) throw new Error("Informe o motivo do bloqueio.");
      const { data: sessao } = await supabase.auth.getUser();
      const uid = sessao.user?.id ?? null;
      let nomeAdmin = "Administrador";
      if (uid) {
        const { data: p } = await supabase.from("profiles").select("nome").eq("id", uid).maybeSingle();
        nomeAdmin = p?.nome ?? nomeAdmin;
      }
      const { error } = await supabase.from("colaboradores_bloqueados").upsert(
        {
          cpf,
          nome: dados.nome.trim(),
          motivo: dados.motivo.trim(),
          bloqueado_por: uid,
          bloqueado_por_nome: nomeAdmin,
        },
        { onConflict: "cpf" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["bloqueados"] });
      void qc.invalidateQueries({ queryKey: ["bloqueio"] });
    },
  });
}

export function useDesbloquearColaborador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("colaboradores_bloqueados").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["bloqueados"] });
      void qc.invalidateQueries({ queryKey: ["bloqueio"] });
    },
  });
}
