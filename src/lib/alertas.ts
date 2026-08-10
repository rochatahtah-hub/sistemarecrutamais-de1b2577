import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AlertaRadar } from "./inteligencia";
import { sincronizarSistema } from "./sincronizar";

export interface AlertaSalvo {
  id: string;
  chave: string;
  nivel: string;
  titulo: string;
  detalhe: string;
  status: string;
  observacao: string;
  resolvido_por_nome: string;
  resolvido_em: string | null;
  updated_at: string;
}

/** Alertas persistidos com situação pendente/resolvido. */
export function useAlertasSalvos() {
  return useQuery({
    queryKey: ["alertas-operacao"],
    queryFn: async (): Promise<AlertaSalvo[]> => {
      const { data, error } = await supabase
        .from("alertas_operacao")
        .select("id,chave,nivel,titulo,detalhe,status,observacao,resolvido_por_nome,resolvido_em,updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AlertaSalvo[];
    },
    staleTime: 15_000,
  });
}

/** Registra/atualiza no banco os alertas detectados, preservando os já resolvidos. */
export function useSincronizarAlertas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (alertas: AlertaRadar[]) => {
      if (alertas.length === 0) return;
      const { error } = await supabase.from("alertas_operacao").upsert(
        alertas.map((a) => ({
          chave: a.id,
          nivel: a.nivel,
          titulo: a.titulo,
          detalhe: a.detalhe,
          itens: a.itens as unknown as never,
        })),
        { onConflict: "chave", ignoreDuplicates: false },
      );
      if (error) throw error;
    },
    onSuccess: () => sincronizarSistema(qc),
  });
}

export function useDefinirStatusAlerta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      chave,
      status,
      nome,
      observacao,
    }: {
      chave: string;
      status: "pendente" | "resolvido";
      nome: string;
      observacao?: string;
    }) => {
      const resolvido = status === "resolvido";
      const { data: sessao } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("alertas_operacao")
        .update({
          status,
          observacao: observacao ?? "",
          resolvido_por: resolvido ? (sessao.user?.id ?? null) : null,
          resolvido_por_nome: resolvido ? nome : "",
          resolvido_em: resolvido ? new Date().toISOString() : null,
        })
        .eq("chave", chave);
      if (error) throw error;
    },
    onSuccess: () => sincronizarSistema(qc),
  });
}
