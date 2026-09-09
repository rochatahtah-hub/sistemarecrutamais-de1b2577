import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  MAPEAMENTO_PADRAO,
  METAS_PADRAO,
  situacaoPorStatus,
  type MapeamentoStatus,
  type Metas,
  type VagaRegistro,
} from "./tipos";
import { sincronizarSistema } from "./sincronizar";
import { useAuth } from "./auth";

type LinhaVaga = {
  id: string;
  data: string;
  quantidade: number | null;
  status: string;
  descricao: string | null;
  observacao: string | null;
  colaborador_id: string | null;
  empresa_id: string | null;
  programadora_id: string | null;
  cargo: string | null;
  horario: string | null;
  local: string | null;
  responsavel: string | null;
  situacao: string | null;
  colaboradores: { nome: string } | null;
  empresas: { nome: string } | null;
  candidatos: { nome: string } | null;
};

export async function buscarVagas(): Promise<VagaRegistro[]> {
  const registros: VagaRegistro[] = [];
  const tamanho = 1000;
  for (let pagina = 0; pagina < 50; pagina++) {
    const { data, error } = await supabase
      .from("vagas")
      .select(
        "id,data,quantidade,status,descricao,observacao,colaborador_id,empresa_id,programadora_id,cargo,horario,local,responsavel,situacao,colaboradores(nome),empresas(nome),candidatos(nome)",
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
        programadora_id: l.programadora_id,
        colaborador: l.colaboradores?.nome ?? "Não identificado",
        empresa: l.empresas?.nome ?? "Não identificada",
        descricao: l.descricao ?? "",
        quantidade: l.quantidade ?? 1,
        status: l.status,
        observacao: l.observacao ?? "",
        cargo: l.cargo || l.descricao || "",
        horario: l.horario ?? "",
        local: l.local ?? "",
        responsavel: l.responsavel ?? "",
        situacao: l.situacao || "ABERTA",
        candidato: l.candidatos?.nome ?? "",
      });
    }
    if (linhas.length < tamanho) break;
  }
  return registros;
}

export function useVagas() {
  return useQuery({ queryKey: ["vagas"], queryFn: buscarVagas, staleTime: 30_000 });
}

/** Atualiza a ficha completa de uma vaga. */
export function useAtualizarVaga() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: {
      id: string;
      cargo?: string;
      horario?: string;
      local?: string;
      responsavel?: string;
      situacao?: string;
      quantidade?: number;
      observacao?: string;
      empresa_id?: string;
      data?: string;
    }) => {
      const { id, ...campos } = dados;
      const { error } = await supabase.from("vagas").update(campos).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => sincronizarSistema(qc),
  });
}

/**
 * Registra a confirmação (presença, falta, cancelamento) de uma vaga.
 * É a fonte real dos indicadores: atualiza também a situação e recarrega
 * dashboard, gráficos, relatórios e indicadores.
 */
export function useRegistrarConfirmacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("vagas")
        .update({ status, situacao: situacaoPorStatus(status) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => sincronizarSistema(qc),
  });
}

/**
 * Verifica se a ficha (vaga) possui registros vinculados que impedem a
 * exclusão — evita registros órfãos e quebra de relacionamentos.
 */
export async function dependenciasDaFicha(id: string): Promise<string[]> {
  const [pag, conf, div, fb] = await Promise.all([
    supabase.from("pagamentos").select("id", { count: "exact", head: true }).eq("vaga_id", id),
    supabase
      .from("atendimento_conferencias")
      .select("id", { count: "exact", head: true })
      .eq("vaga_id", id),
    supabase
      .from("atendimento_divergencias")
      .select("id", { count: "exact", head: true })
      .eq("vaga_id", id),
    supabase.from("feedbacks").select("id", { count: "exact", head: true }).eq("vaga_id", id),
  ]);
  const itens: string[] = [];
  if ((pag.count ?? 0) > 0) itens.push("pagamento");
  if ((conf.count ?? 0) > 0) itens.push("conferência de atendimento");
  if ((div.count ?? 0) > 0) itens.push("divergência de atendimento");
  if ((fb.count ?? 0) > 0) itens.push("feedback");
  return itens;
}

/**
 * Exclui uma ficha do histórico. Recusa a exclusão quando existem registros
 * vinculados. A auditoria é registrada pelo gatilho do banco (tabela vagas).
 */
export function useExcluirFicha() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const vinculos = await dependenciasDaFicha(id);
      if (vinculos.length > 0) {
        throw new Error(
          `Não é possível excluir: esta ficha possui ${vinculos.join(", ")} vinculado(s). Remova ou trate esses registros antes de excluir.`,
        );
      }
      const { error } = await supabase.from("vagas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => sincronizarSistema(qc),
  });
}

export interface Configuracoes {
  metas: Metas;
  mapeamento: MapeamentoStatus;
  metaPresencas: number;
  inatividadeHoras: number;
  expedienteInicio: string;
  expedienteFim: string;
}

export async function buscarConfiguracoes(): Promise<Configuracoes> {
  const { data, error } = await supabase.from("configuracoes").select("chave,valor");
  if (error) throw error;
  const mapa = new Map((data ?? []).map((r) => [r.chave, r.valor as unknown]));
  return {
    metas: (mapa.get("metas") as Metas | undefined) ?? METAS_PADRAO,
    mapeamento: (mapa.get("mapeamento_status") as MapeamentoStatus | undefined) ?? MAPEAMENTO_PADRAO,
    metaPresencas: (mapa.get("meta_presencas") as number | undefined) ?? 0,
    inatividadeHoras: (mapa.get("inatividade_horas") as number | undefined) ?? 2,
    expedienteInicio: (mapa.get("expediente_inicio") as string | undefined) ?? "08:00",
    expedienteFim: (mapa.get("expediente_fim") as string | undefined) ?? "18:00",
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
    onSuccess: () => sincronizarSistema(qc),
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

/** Última importação registrada (histórico). O banco é a fonte oficial dos dados. */
export function usePlanilhaAtiva() {
  const { podeOperar } = useAuth();
  return useQuery({
    enabled: podeOperar,
    queryKey: ["planilha-ativa"],
    queryFn: async () => {
      const [imp, cont] = await Promise.all([
        supabase
          .from("importacoes")
          .select("id,nome_arquivo,data_importacao,registros_adicionados")
          .order("data_importacao", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("vagas")
          .select("id", { count: "exact", head: true })
          .not("importacao_id", "is", null),
      ]);
      if (imp.error) throw imp.error;
      if (cont.error) throw cont.error;
      if (!imp.data) return null;
      const registros = cont.count ?? 0;
      return {
        nome_arquivo: imp.data?.nome_arquivo ?? "planilha.xlsx",
        data_importacao: imp.data?.data_importacao ?? null,
        registros,
      };
    },
    staleTime: 30_000,
  });
}

/**
 * Desvincula a planilha: remove apenas o vínculo com o arquivo importado.
 * NENHUM dado é apagado — as vagas passam a constar como registros próprios
 * do Recruta+ e todo o histórico, indicadores e gráficos permanecem intactos.
 */
export function useRetirarPlanilha() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const vagas = await supabase
        .from("vagas")
        .update({ importacao_id: null, origem: "sistema" })
        .not("importacao_id", "is", null);
      if (vagas.error) throw vagas.error;
      const imp = await supabase.from("importacoes").delete().not("id", "is", null);
      if (imp.error) throw imp.error;
    },
    onSuccess: () => sincronizarSistema(qc),
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