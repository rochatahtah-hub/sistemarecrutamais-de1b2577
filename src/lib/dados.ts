import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  MAPEAMENTO_PADRAO,
  METAS_PADRAO,
  type MapeamentoStatus,
  type Metas,
  type VagaRegistro,
} from "./tipos";

type LinhaVaga = {
  id: string;
  data: string;
  quantidade: number | null;
  status: string;
  descricao: string | null;
  observacao: string | null;
  colaborador_id: string | null;
  empresa_id: string | null;
  colaboradores: { nome: string } | null;
  empresas: { nome: string } | null;
};

export async function buscarVagas(): Promise<VagaRegistro[]> {
  const registros: VagaRegistro[] = [];
  const tamanho = 1000;
  for (let pagina = 0; pagina < 50; pagina++) {
    const { data, error } = await supabase
      .from("vagas")
      .select(
        "id,data,quantidade,status,descricao,observacao,colaborador_id,empresa_id,colaboradores(nome),empresas(nome)",
      )
      .order("data", { ascending: false })
      .range(pagina * tamanho, pagina * tamanho + tamanho - 1);
    if (error) throw error;
    const linhas = (data ?? []) as unknown as LinhaVaga[];
    for (const l of linhas) {
      registros.push({
        id: l.id,
        data: l.data,
        colaborador_id: l.colaborador_id,
        empresa_id: l.empresa_id,
        colaborador: l.colaboradores?.nome ?? "Não identificado",
        empresa: l.empresas?.nome ?? "Não identificada",
        descricao: l.descricao ?? "",
        quantidade: l.quantidade ?? 1,
        status: l.status,
        observacao: l.observacao ?? "",
      });
    }
    if (linhas.length < tamanho) break;
  }
  return registros;
}

export function useVagas() {
  return useQuery({ queryKey: ["vagas"], queryFn: buscarVagas, staleTime: 30_000 });
}

export interface Configuracoes {
  metas: Metas;
  mapeamento: MapeamentoStatus;
}

export async function buscarConfiguracoes(): Promise<Configuracoes> {
  const { data, error } = await supabase.from("configuracoes").select("chave,valor");
  if (error) throw error;
  const mapa = new Map((data ?? []).map((r) => [r.chave, r.valor as unknown]));
  return {
    metas: (mapa.get("metas") as Metas | undefined) ?? METAS_PADRAO,
    mapeamento: (mapa.get("mapeamento_status") as MapeamentoStatus | undefined) ?? MAPEAMENTO_PADRAO,
  };
}

export function useConfiguracoes() {
  return useQuery({
    queryKey: ["configuracoes"],
    queryFn: buscarConfiguracoes,
    staleTime: 60_000,
  });
}

export function useSalvarConfiguracao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ chave, valor }: { chave: string; valor: unknown }) => {
      const { error } = await supabase
        .from("configuracoes")
        .upsert({ chave, valor: valor as never, updated_at: new Date().toISOString() }, { onConflict: "chave" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["configuracoes"] }),
  });
}

export function useImportacoes() {
  return useQuery({
    queryKey: ["importacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("importacoes")
        .select("*")
        .order("data_importacao", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Planilha atualmente ativa (última importação concluída) + volume de registros. */
export function usePlanilhaAtiva() {
  return useQuery({
    queryKey: ["planilha-ativa"],
    queryFn: async () => {
      const [imp, cont] = await Promise.all([
        supabase
          .from("importacoes")
          .select("id,nome_arquivo,data_importacao,registros_adicionados")
          .order("data_importacao", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("vagas").select("id", { count: "exact", head: true }),
      ]);
      if (imp.error) throw imp.error;
      if (cont.error) throw cont.error;
      const registros = cont.count ?? 0;
      if (registros === 0) return null;
      return {
        nome_arquivo: imp.data?.nome_arquivo ?? "planilha.xlsx",
        data_importacao: imp.data?.data_importacao ?? null,
        registros,
      };
    },
    staleTime: 30_000,
  });
}

/** Retira a planilha ativa: limpa toda a base usada pelo sistema. */
export function useRetirarPlanilha() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const tabelas = ["vagas", "colaboradores", "empresas", "importacoes"] as const;
      for (const tabela of tabelas) {
        const { error } = await supabase.from(tabela).delete().not("id", "is", null);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useCadastros() {
  return useQuery({
    queryKey: ["cadastros"],
    queryFn: async () => {
      const [col, emp] = await Promise.all([
        supabase.from("colaboradores").select("id,nome,ativo").order("nome"),
        supabase.from("empresas").select("id,nome,ativo").order("nome"),
      ]);
      if (col.error) throw col.error;
      if (emp.error) throw emp.error;
      return { colaboradores: col.data ?? [], empresas: emp.data ?? [] };
    },
  });
}