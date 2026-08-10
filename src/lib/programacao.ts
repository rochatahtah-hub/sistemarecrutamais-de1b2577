import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { quinzenaAtual, dentroDaQuinzena } from "./quinzena";
import { sincronizarSistema } from "./sincronizar";

export interface Empresa {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface Candidato {
  id: string;
  nome: string;
  cpf: string;
  telefone: string | null;
}

export function soDigitos(v: string) {
  return (v ?? "").replace(/\D/g, "");
}

export function formatarCPF(v: string) {
  const d = soDigitos(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

export function formatarTelefone(v: string) {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
}

/* ---------------- Empresas ---------------- */

export function useEmpresas() {
  return useQuery({
    queryKey: ["empresas-cadastro"],
    queryFn: async ({ signal }): Promise<Empresa[]> => {
      const { data, error } = await supabase
          .from("empresas")
          .select("id,nome,ativo")
          .order("nome")
          .abortSignal(signal);
      if (error) throw error;
      return data ?? [];
    },
    retry: false,
    staleTime: 30_000,
  });
}

export function useSalvarEmpresa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: { id?: string; nome: string; ativo?: boolean }) => {
      if (dados.id) {
        const { error } = await supabase
          .from("empresas")
          .update({ nome: dados.nome, ativo: dados.ativo ?? true })
          .eq("id", dados.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("empresas").insert({ nome: dados.nome });
      if (error) throw error;
    },
    onSuccess: () => {
      sincronizarSistema(qc);
    },
  });
}

/* ---------------- Candidatos ---------------- */

/** Remove caracteres que quebram o filtro do PostgREST e limita o tamanho. */
function termoSeguro(v: string) {
  return (v ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[,()%*"\\]/g, " ")
    .trim()
    .slice(0, 80);
}

export function useCandidatos(busca = "") {
  const termo = termoSeguro(busca);
  return useQuery({
    queryKey: ["candidatos", termo],
    queryFn: async ({ signal }): Promise<Candidato[]> => {
      let q = supabase
          .from("candidatos")
          .select("id,nome,cpf,telefone")
          .order("nome")
          .limit(50)
          .abortSignal(signal);
        if (termo) {
          const digitos = soDigitos(termo);
          q = q.or(
            digitos
              ? `nome.ilike.%${termo}%,cpf.ilike.%${digitos}%`
              : `nome.ilike.%${termo}%`,
          );
        }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    retry: false,
    placeholderData: (anterior) => anterior,
    staleTime: 15_000,
  });
}

export async function buscarCandidatoPorCPF(cpf: string): Promise<Candidato | null> {
  const limpo = soDigitos(cpf);
  if (limpo.length < 11) return null;
  const { data, error } = await supabase
    .from("candidatos")
    .select("id,nome,cpf,telefone")
    .eq("cpf", limpo)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export function useSalvarCandidato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: {
      nome: string;
      cpf: string;
      telefone: string;
    }): Promise<{ candidato: Candidato; jaExistia: boolean }> => {
      const cpf = soDigitos(dados.cpf);
      const existente = await buscarCandidatoPorCPF(cpf);
      if (existente) return { candidato: existente, jaExistia: true };
      const { data: sessao } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("candidatos")
        .insert({
          nome: dados.nome.trim(),
          cpf,
          telefone: soDigitos(dados.telefone),
          criado_por: sessao.user?.id ?? null,
        })
        .select("id,nome,cpf,telefone")
        .single();
      if (error) throw error;
      return { candidato: data as Candidato, jaExistia: false };
    },
    onSuccess: () => sincronizarSistema(qc),
  });
}

/* ---------------- Programacoes ---------------- */

async function garantirColaborador(nome: string): Promise<string> {
  const { data } = await supabase
    .from("colaboradores")
    .select("id")
    .eq("nome", nome)
    .maybeSingle();
  if (data?.id) return data.id;
  const { data: novo, error } = await supabase
    .from("colaboradores")
    .insert({ nome })
    .select("id")
    .single();
  if (error) throw error;
  return novo.id;
}

export interface NovaProgramacao {
  candidato: Candidato;
  data: string;
  empresa_id: string;
  status: "AGUARDANDO" | "PRESENCA" | "FALTA" | "CANCELAMENTO";
  observacao?: string;
}

export function useCriarProgramacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: NovaProgramacao) => {
      const { buscarBloqueio } = await import("./bloqueios");
      const bloqueio = await buscarBloqueio(p.candidato.cpf);
      if (bloqueio) {
        throw new Error(
          `🚫 COLABORADOR BLOQUEADO — ${p.candidato.nome}. Motivo: ${bloqueio.motivo || "não informado"}. Procure o responsável pelo sistema para liberação.`,
        );
      }
      const { data: sessao } = await supabase.auth.getUser();
      const uid = sessao.user?.id;
      if (!uid) throw new Error("Sessão expirada. Faça login novamente.");
      const { data: perfil } = await supabase
        .from("profiles")
        .select("nome,meta_quinzena")
        .eq("id", uid)
        .maybeSingle();
      const nome = perfil?.nome ?? "Programadora";
      const colaborador_id = await garantirColaborador(nome);

      const { error } = await supabase.from("vagas").insert({
        data: p.data,
        colaborador_id,
        empresa_id: p.empresa_id,
        candidato_id: p.candidato.id,
        programadora_id: uid,
        descricao: p.candidato.nome,
        quantidade: 1,
        status: p.status,
        observacao: p.observacao ?? "",
        origem: "manual",
      });
      if (error) throw error;

      await supabase
        .from("profiles")
        .update({ ultimo_preenchimento: new Date().toISOString() })
        .eq("id", uid);

      return verificarMeta(uid, nome, perfil?.meta_quinzena ?? 0);
    },
    onSuccess: () => sincronizarSistema(qc),
  });
}

/** Cria notificacao quando a meta da quinzena e atingida ou superada. */
async function verificarMeta(uid: string, nome: string, meta: number) {
  if (!meta || meta <= 0) return { metaAtingida: false, mensagem: "" };
  const q = quinzenaAtual();
  const { count } = await supabase
    .from("vagas")
    .select("id", { count: "exact", head: true })
    .eq("programadora_id", uid)
    .eq("status", "PRESENCA")
    .gte("data", q.inicio)
    .lte("data", q.fim);
  const presencas = count ?? 0;
  if (presencas < meta) return { metaAtingida: false, mensagem: "" };
  const superada = presencas > meta;
  const chave = `meta-${q.chave}-${superada ? "superada" : "atingida"}`;
  const mensagem = superada
    ? `Você superou sua meta da quinzena: ${presencas} presenças (meta ${meta}).`
    : `Parabéns! Você atingiu sua meta de ${meta} presenças na quinzena.`;
  await supabase.from("notificacoes").upsert(
    {
      user_id: uid,
      tipo: "meta",
      titulo: superada ? "META SUPERADA" : "META ATINGIDA",
      mensagem,
      chave,
    },
    { onConflict: "user_id,chave", ignoreDuplicates: true },
  );
  await supabase.from("notificacoes").upsert(
    {
      user_id: uid,
      para_admin: true,
      tipo: "meta-admin",
      titulo: `${nome}: ${superada ? "meta superada" : "meta atingida"}`,
      mensagem: `${nome} registrou ${presencas} presenças na quinzena (meta ${meta}).`,
      chave: `${chave}-admin`,
    },
    { onConflict: "user_id,chave", ignoreDuplicates: true },
  );
  return { metaAtingida: true, mensagem };
}

/* ---------------- Perfis / programadoras ---------------- */

export interface PerfilLista {
  id: string;
  nome: string;
  email: string | null;
  ativo: boolean;
  meta_quinzena: number;
  ultimo_acesso: string | null;
  ultimo_preenchimento: string | null;
}

export function useProgramadoras() {
  return useQuery({
    queryKey: ["programadoras"],
    queryFn: async (): Promise<PerfilLista[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,nome,email,ativo,meta_quinzena,ultimo_acesso,ultimo_preenchimento")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

export function useAtualizarPerfil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: {
      id: string;
      nome?: string;
      ativo?: boolean;
      meta_quinzena?: number;
    }) => {
      const { id, ...campos } = dados;
      const { error } = await supabase.from("profiles").update(campos).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => sincronizarSistema(qc),
  });
}

/* ---------------- Minhas programacoes ---------------- */

export interface RegistroProgramacao {
  id: string;
  data: string;
  status: string;
  descricao: string | null;
  observacao: string | null;
  empresa: string;
  candidato_nome: string;
  candidato_cpf: string;
  candidato_telefone: string | null;
}

export function useMinhasProgramacoes(userId?: string) {
  return useQuery({
    enabled: Boolean(userId),
    queryKey: ["minhas-programacoes", userId],
    queryFn: async (): Promise<RegistroProgramacao[]> => {
      const { data, error } = await supabase
        .from("vagas")
        .select(
          "id,data,status,descricao,observacao,empresas(nome),candidatos(nome,cpf,telefone)",
        )
        .eq("programadora_id", userId!)
        .order("data", { ascending: false })
        .limit(500);
      if (error) throw error;
      type Linha = {
        id: string;
        data: string;
        status: string;
        descricao: string | null;
        observacao: string | null;
        empresas: { nome: string } | null;
        candidatos: { nome: string; cpf: string; telefone: string | null } | null;
      };
      return ((data ?? []) as unknown as Linha[]).map((l) => ({
        id: l.id,
        data: l.data,
        status: l.status,
        descricao: l.descricao,
        observacao: l.observacao,
        empresa: l.empresas?.nome ?? "—",
        candidato_nome: l.candidatos?.nome ?? l.descricao ?? "—",
        candidato_cpf: l.candidatos?.cpf ?? "",
        candidato_telefone: l.candidatos?.telefone ?? null,
      }));
    },
  });
}

export function useExcluirProgramacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vagas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => sincronizarSistema(qc),
  });
}

/** Confirma posteriormente a situação de uma vaga programada. */
export function useConfirmarProgramacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      id: string;
      status: "AGUARDANDO" | "PRESENCA" | "FALTA" | "CANCELAMENTO";
    }) => {
      const { situacaoPorStatus } = await import("./tipos");
      const { error } = await supabase
        .from("vagas")
        .update({ status: p.status, situacao: situacaoPorStatus(p.status) })
        .eq("id", p.id);
      if (error) throw error;
      const { data: sessao } = await supabase.auth.getUser();
      const uid = sessao.user?.id;
      if (!uid || p.status !== "PRESENCA") return { metaAtingida: false, mensagem: "" };
      const { data: perfil } = await supabase
        .from("profiles")
        .select("nome,meta_quinzena")
        .eq("id", uid)
        .maybeSingle();
      return verificarMeta(uid, perfil?.nome ?? "Programadora", perfil?.meta_quinzena ?? 0);
    },
    onSuccess: () => sincronizarSistema(qc),
  });
}

/* ---------------- Notificacoes ---------------- */

export interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  para_admin: boolean;
  created_at: string;
}

export function useNotificacoes() {
  return useQuery({
    queryKey: ["notificacoes"],
    queryFn: async (): Promise<Notificacao[]> => {
      const { data, error } = await supabase
        .from("notificacoes")
        .select("id,tipo,titulo,mensagem,lida,para_admin,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });
}

export function useMarcarNotificacoesLidas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase.from("notificacoes").update({ lida: true }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => sincronizarSistema(qc),
  });
}

/* ---------------- Historico de quinzenas ---------------- */

export function useHistoricoQuinzenas() {
  return useQuery({
    queryKey: ["quinzenas-historico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quinzenas_historico")
        .select("id,chave,inicio,fim,resumo,fechada_em")
        .order("inicio", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFecharQuinzena() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (resumo: {
      chave: string;
      inicio: string;
      fim: string;
      dados: Record<string, unknown>;
    }) => {
      const { error } = await supabase.from("quinzenas_historico").upsert(
        {
          chave: resumo.chave,
          inicio: resumo.inicio,
          fim: resumo.fim,
          resumo: resumo.dados as never,
          fechada_em: new Date().toISOString(),
        },
        { onConflict: "chave" },
      );
      if (error) throw error;
    },
    onSuccess: () => sincronizarSistema(qc),
  });
}

export { quinzenaAtual, dentroDaQuinzena };
