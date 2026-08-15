import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { soDigitos } from "./programacao";
import { sincronizarSistema } from "./sincronizar";

export type TipoBloqueio = "TODAS_EMPRESAS" | "EMPRESA_ESPECIFICA";

export const TIPO_ROTULO: Record<TipoBloqueio, string> = {
  TODAS_EMPRESAS: "Todas as empresas",
  EMPRESA_ESPECIFICA: "Empresa específica",
};

/** Registro completo de bloqueio (lista/edição). */
export interface Bloqueio {
  id: string;
  cpf: string;
  nome: string;
  telefone: string;
  motivo: string;
  tipo_bloqueio: TipoBloqueio;
  empresa_id: string | null;
  empresa_nome: string;
  ativo: boolean;
  bloqueado_por_nome: string;
  created_at: string;
  updated_at: string;
}

/** Resultado da verificação central (RPC no banco). */
export interface BloqueioAtivo {
  bloqueado: true;
  cpf: string;
  nome: string;
  motivo: string;
  tipo_bloqueio: TipoBloqueio;
  empresa_id: string | null;
  empresa_nome: string;
  created_at: string;
  bloqueado_por_nome: string;
}

/** Mensagem padronizada exibida quando o colaborador está bloqueado. */
export function mensagemBloqueio(b: BloqueioAtivo) {
  const alcance =
    b.tipo_bloqueio === "TODAS_EMPRESAS"
      ? "Este colaborador está bloqueado para todas as empresas."
      : `Este colaborador está bloqueado para ${b.empresa_nome || "esta empresa"}.`;
  return `🚫 COLABORADOR BLOQUEADO — ${alcance} Motivo: ${b.motivo || "não informado"}.`;
}

/**
 * Verificação central de bloqueio: consulta o banco por CPF e (opcionalmente)
 * empresa. Sem empresa, considera apenas bloqueios gerais.
 */
export async function verificarBloqueio(
  cpf: string,
  empresaId?: string | null,
): Promise<BloqueioAtivo | null> {
  const limpo = soDigitos(cpf);
  if (limpo.length !== 11) return null;
  const { data, error } = await supabase.rpc("verificar_bloqueio", {
    _cpf: limpo,
    _empresa_id: empresaId ?? undefined,
  });
  if (error) throw error;
  const linha = (data ?? [])[0];
  if (!linha) return null;
  return {
    bloqueado: true,
    cpf: limpo,
    nome: "",
    motivo: linha.motivo ?? "",
    tipo_bloqueio: (linha.tipo_bloqueio as TipoBloqueio) ?? "TODAS_EMPRESAS",
    empresa_id: linha.empresa_id ?? null,
    empresa_nome: linha.empresa_nome ?? "",
    created_at: linha.created_at ?? new Date().toISOString(),
    bloqueado_por_nome: linha.bloqueado_por_nome ?? "",
  };
}

/** Compatibilidade: consulta apenas bloqueios que valem para a empresa informada. */
export const buscarBloqueio = verificarBloqueio;

export interface FiltroBloqueios {
  busca?: string;
  empresaId?: string;
  tipo?: TipoBloqueio | "";
  status?: "ativos" | "inativos" | "todos";
  de?: string;
  ate?: string;
}

const SELECT_BLOQUEIO =
  "id,cpf,nome,telefone,motivo,tipo_bloqueio,empresa_id,ativo,bloqueado_por_nome,created_at,updated_at,empresas(nome)";

type LinhaBloqueio = Omit<Bloqueio, "empresa_nome"> & { empresas: { nome: string } | null };

export function useBloqueados(filtros: FiltroBloqueios | string = {}) {
  const f: FiltroBloqueios = typeof filtros === "string" ? { busca: filtros } : filtros;
  return useQuery({
    queryKey: ["bloqueados", f],
    queryFn: async (): Promise<Bloqueio[]> => {
      let q = supabase
        .from("colaboradores_bloqueados")
        .select(SELECT_BLOQUEIO)
        .order("created_at", { ascending: false });

      const termo = (f.busca ?? "").trim().replace(/[,()%*"\\]/g, " ");
      if (termo) {
        const dig = soDigitos(termo);
        q = dig ? q.or(`cpf.ilike.%${dig}%,nome.ilike.%${termo}%`) : q.ilike("nome", `%${termo}%`);
      }
      if (f.empresaId) q = q.eq("empresa_id", f.empresaId);
      if (f.tipo) q = q.eq("tipo_bloqueio", f.tipo);
      if (!f.status || f.status === "ativos") q = q.eq("ativo", true);
      else if (f.status === "inativos") q = q.eq("ativo", false);
      if (f.de) q = q.gte("created_at", `${f.de}T00:00:00`);
      if (f.ate) q = q.lte("created_at", `${f.ate}T23:59:59`);

      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as unknown as LinhaBloqueio[]).map((l) => ({
        ...l,
        empresa_nome: l.empresas?.nome ?? "",
      }));
    },
  });
}

export interface DadosBloqueio {
  id?: string;
  cpf: string;
  nome?: string;
  telefone?: string;
  motivo: string;
  tipo_bloqueio: TipoBloqueio;
  empresa_id?: string | null;
  ativo?: boolean;
}

async function autorAtual() {
  const { data: sessao } = await supabase.auth.getUser();
  const uid = sessao.user?.id ?? null;
  let nome = "Administrador";
  if (uid) {
    const { data } = await supabase.from("profiles").select("nome").eq("id", uid).maybeSingle();
    nome = data?.nome ?? nome;
  }
  return { uid, nome };
}

function normalizar(dados: DadosBloqueio) {
  const cpf = soDigitos(dados.cpf);
  if (cpf.length !== 11) throw new Error("Informe um CPF completo.");
  const motivo = (dados.motivo ?? "").trim();
  if (motivo.length < 3) throw new Error("Informe o motivo do bloqueio.");
  const geral = dados.tipo_bloqueio === "TODAS_EMPRESAS";
  const empresa_id = geral ? null : (dados.empresa_id ?? null);
  if (!geral && !empresa_id) throw new Error("Selecione a empresa do bloqueio.");
  return { cpf, motivo, empresa_id, tipo_bloqueio: dados.tipo_bloqueio };
}

/** Cria ou edita um bloqueio, impedindo duplicidade na mesma abrangência. */
export function useSalvarBloqueio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: DadosBloqueio) => {
      const base = normalizar(dados);
      const ativo = dados.ativo ?? true;

      if (ativo) {
        let dup = supabase
          .from("colaboradores_bloqueados")
          .select("id")
          .eq("cpf", base.cpf)
          .eq("ativo", true)
          .eq("tipo_bloqueio", base.tipo_bloqueio);
        dup = base.empresa_id ? dup.eq("empresa_id", base.empresa_id) : dup.is("empresa_id", null);
        if (dados.id) dup = dup.neq("id", dados.id);
        const { data: existentes, error: erroDup } = await dup.limit(1);
        if (erroDup) throw erroDup;
        if ((existentes ?? []).length > 0) {
          throw new Error("Este colaborador já possui um bloqueio ativo para esta abrangência.");
        }
      }

      if (dados.id) {
        const { error } = await supabase
          .from("colaboradores_bloqueados")
          .update({ ...base, ativo, nome: (dados.nome ?? "").trim() })
          .eq("id", dados.id);
        if (error) throw error;
        return;
      }

      const { uid, nome } = await autorAtual();
      const { error } = await supabase.from("colaboradores_bloqueados").insert({
        ...base,
        ativo,
        nome: (dados.nome ?? "").trim(),
        telefone: soDigitos(dados.telefone ?? ""),
        bloqueado_por: uid,
        bloqueado_por_nome: nome,
      });
      if (error) throw error;
    },
    onSuccess: () => sincronizarSistema(qc),
  });
}

/** Desbloqueio: mantém o histórico, apenas inativa o registro. */
export function useDesbloquearColaborador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("colaboradores_bloqueados")
        .update({ ativo: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => sincronizarSistema(qc),
  });
}

/** Compatibilidade com telas que criam bloqueio geral direto. */
export function useBloquearColaborador() {
  const salvar = useSalvarBloqueio();
  return {
    ...salvar,
    mutate: (dados: { cpf: string; nome: string; motivo: string }, opcoes?: Parameters<typeof salvar.mutate>[1]) =>
      salvar.mutate({ ...dados, tipo_bloqueio: "TODAS_EMPRESAS" }, opcoes),
    mutateAsync: (dados: { cpf: string; nome: string; motivo: string }) =>
      salvar.mutateAsync({ ...dados, tipo_bloqueio: "TODAS_EMPRESAS" }),
  };
}

export function useBloqueio(cpf: string, empresaId?: string | null) {
  const limpo = soDigitos(cpf);
  return useQuery({
    enabled: limpo.length === 11,
    queryKey: ["bloqueio", limpo, empresaId ?? null],
    queryFn: () => verificarBloqueio(limpo, empresaId),
    staleTime: 10_000,
  });
}
