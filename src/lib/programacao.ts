import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";
import { cpfValido } from "./diarias";
import { formatarNome } from "./ficha-texto";
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
  transporte_proprio: boolean;
  transporte_tipos: string[];
  precisa_fretado: boolean;
  transporte_observacao: string;
  /** Função/cargo exercido — vem do cadastro de funções (tabela funcoes). */
  funcao: string;
  /** Chave Pix do colaborador (dado sensível: nunca vai para URL). */
  pix_chave: string;
  /** Caminho do documento de identidade no armazenamento privado. */
  documento_path: string;
  documento_nome: string;
}

/** Tipos de transporte próprio aceitos (valor no banco → rótulo exibido). */
export const TIPOS_TRANSPORTE = [
  { valor: "bicicleta", rotulo: "Bicicleta" },
  { valor: "bicicleta_eletrica", rotulo: "Bicicleta elétrica" },
  { valor: "moto", rotulo: "Moto" },
  { valor: "carro", rotulo: "Carro" },
] as const;

export type TipoTransporte = (typeof TIPOS_TRANSPORTE)[number]["valor"];

export interface DadosTransporte {
  transporte_proprio: boolean;
  transporte_tipos: string[];
  precisa_fretado: boolean;
  transporte_observacao: string;
}

export const TRANSPORTE_PADRAO: DadosTransporte = {
  transporte_proprio: false,
  transporte_tipos: [],
  precisa_fretado: false,
  transporte_observacao: "",
};

export function rotuloTransporte(valor: string): string {
  return TIPOS_TRANSPORTE.find((t) => t.valor === valor)?.rotulo ?? valor;
}

/** Normaliza os dados de transporte antes de gravar (coerência e limites). */
export function normalizarTransporte(dados: Partial<DadosTransporte>): DadosTransporte {
  const proprio = dados.transporte_proprio === true;
  const permitidos = TIPOS_TRANSPORTE.map((t) => t.valor as string);
  const tipos = proprio
    ? Array.from(new Set(dados.transporte_tipos ?? [])).filter((t) => permitidos.includes(t))
    : [];
  return {
    transporte_proprio: proprio,
    transporte_tipos: tipos,
    precisa_fretado: dados.precisa_fretado === true,
    transporte_observacao: (dados.transporte_observacao ?? "").trim().slice(0, 500),
  };
}

const CAMPOS_CANDIDATO =
  "id,nome,cpf,telefone,transporte_proprio,transporte_tipos,precisa_fretado,transporte_observacao,funcao,pix_chave,documento_path,documento_nome";

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
export function termoSeguro(v: string) {
  return (v ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[,()%*"\\]/g, " ")
    .trim()
    .slice(0, 80);
}

export function useCandidatos(busca = "", habilitado = true) {
  const termo = termoSeguro(busca);
  return useQuery({
    enabled: habilitado,
    queryKey: ["candidatos", termo],
    queryFn: async ({ signal }): Promise<Candidato[]> => {
      let q = supabase
        .from("candidatos")
        .select(CAMPOS_CANDIDATO)
        .order("nome")
        .limit(50)
        .abortSignal(signal);
      if (termo) {
        const digitos = soDigitos(termo);
        q = q.or(
          digitos ? `nome.ilike.%${termo}%,cpf.ilike.%${digitos}%` : `nome.ilike.%${termo}%`,
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
    .select(CAMPOS_CANDIDATO)
    .eq("cpf", limpo)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export interface DadosSalvarCandidato {
  nome: string;
  cpf: string;
  telefone: string;
  transporte?: Partial<DadosTransporte>;
  funcao?: string;
  pix_chave?: string;
}

/**
 * Cadastra ou atualiza um candidato pelo CPF. Recusa CPF com dígito
 * verificador inválido — nenhum candidato com CPF errado chega a ser gravado.
 */
export async function salvarCandidato(
  dados: DadosSalvarCandidato,
): Promise<{ candidato: Candidato; jaExistia: boolean }> {
  const cpf = soDigitos(dados.cpf);
  if (!cpfValido(cpf)) throw new Error("Informe um CPF válido.");
  const nome = formatarNome(dados.nome);
  if (nome.length < 3) throw new Error("Informe o nome do colaborador (somente letras).");
  const extras: { funcao?: string; pix_chave?: string; nome?: string } = {};
  if (dados.funcao !== undefined) extras.funcao = dados.funcao.trim().slice(0, 80);
  if (dados.pix_chave !== undefined) extras.pix_chave = dados.pix_chave.trim().slice(0, 140);
  const existente = await buscarCandidatoPorCPF(cpf);
  if (existente) {
    // A ficha é a fonte única: o nome normalizado também é atualizado no cadastro.
    if (existente.nome !== nome) extras.nome = nome;
    const temExtras = Object.keys(extras).length > 0;
    if (!dados.transporte && !temExtras) return { candidato: existente, jaExistia: true };
    const transporte = dados.transporte ? normalizarTransporte(dados.transporte) : {};
    const { data: atualizado, error: erroUpdate } = await supabase
      .from("candidatos")
      .update({ ...transporte, ...extras })
      .eq("id", existente.id)
      .select(CAMPOS_CANDIDATO)
      .single();
    if (erroUpdate) throw erroUpdate;
    return { candidato: atualizado as Candidato, jaExistia: true };
  }
  const { data: sessao } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("candidatos")
    .insert({
      nome,
      cpf,
      telefone: soDigitos(dados.telefone),
      criado_por: sessao.user?.id ?? null,
      ...normalizarTransporte(dados.transporte ?? {}),
      ...extras,
    })
    .select(CAMPOS_CANDIDATO)
    .single();
  if (error) throw error;
  return { candidato: data as Candidato, jaExistia: false };
}

export function useSalvarCandidato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salvarCandidato,
    onSuccess: () => sincronizarSistema(qc),
  });
}

/** Atualiza somente os dados de transporte e deslocamento do candidato. */
export function useAtualizarTransporte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: { id: string } & Partial<DadosTransporte>): Promise<Candidato> => {
      const { id, ...resto } = dados;
      const { data, error } = await supabase
        .from("candidatos")
        .update(normalizarTransporte(resto))
        .eq("id", id)
        .select(CAMPOS_CANDIDATO)
        .maybeSingle();
      if (error) throw error;
      if (!data)
        throw new Error(
          "Não foi possível salvar o transporte: sem permissão para editar este candidato.",
        );
      return data as Candidato;
    },
    onSuccess: () => sincronizarSistema(qc),
  });
}

/** Dados do colaborador usados na Minha Programação: função, Pix e documento. */
export interface DadosColaborador {
  funcao: string;
  pix_chave: string;
  documento_path: string;
  documento_nome: string;
}

/**
 * Salva função, chave Pix e vínculo do documento de identidade diretamente
 * na ficha do candidato (tabela candidatos) — nada fica em estado local.
 */
export function useAtualizarDadosCandidato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: { id: string } & Partial<DadosColaborador>): Promise<Candidato> => {
      const { id, ...resto } = dados;
      const campos: Partial<DadosColaborador> = {};
      if (resto.funcao !== undefined) campos.funcao = resto.funcao.trim().slice(0, 80);
      if (resto.pix_chave !== undefined) campos.pix_chave = resto.pix_chave.trim().slice(0, 140);
      if (resto.documento_path !== undefined) campos.documento_path = resto.documento_path;
      if (resto.documento_nome !== undefined) campos.documento_nome = resto.documento_nome;

      const { data, error } = await supabase
        .from("candidatos")
        .update(campos)
        .eq("id", id)
        .select(CAMPOS_CANDIDATO)
        .maybeSingle();
      if (error) throw error;
      if (!data)
        throw new Error("Não foi possível salvar: sem permissão para editar este colaborador.");
      return data as Candidato;
    },
    onSuccess: () => sincronizarSistema(qc),
  });
}

/* ---------------- Programacoes ---------------- */

async function garantirColaborador(nome: string): Promise<string> {
  const { data } = await supabase.from("colaboradores").select("id").eq("nome", nome).maybeSingle();
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

/**
 * Cria uma programação (agenda um colaborador numa vaga). Verifica bloqueio
 * ANTES de qualquer gravação — se o colaborador estiver bloqueado (geral ou
 * para a empresa), a vaga nunca chega a ser criada.
 */
/** Mensagem única de ficha repetida (interface e banco usam o mesmo texto). */
export const MSG_FICHA_DUPLICADA =
  "⚠️ Ficha já fechada para esta vaga.\n\nEste colaborador já possui uma ficha fechada para esta mesma vaga. Verifique o histórico antes de continuar.";

/**
 * Consulta o histórico completo (não apenas a programação atual) para saber se
 * o colaborador já teve uma ficha fechada para a mesma vaga — identificada pelo
 * registro da vaga no banco (empresa + data + cargo).
 */
export async function fichaJaFechada(p: {
  candidato_id: string;
  empresa_id: string;
  data: string;
  cargo?: string;
}): Promise<boolean> {
  const { data, error } = await supabase
    .from("vagas")
    .select("id,cargo,status")
    .eq("candidato_id", p.candidato_id)
    .eq("empresa_id", p.empresa_id)
    .eq("data", p.data)
    .limit(200);
  if (error) throw error;
  const alvo = (p.cargo ?? "").trim().toLowerCase();
  return (data ?? []).some(
    (v) => (v.cargo ?? "").trim().toLowerCase() === alvo && v.status !== "CANCELAMENTO",
  );
}

export async function criarProgramacao(p: NovaProgramacao) {
  const { verificarBloqueio, mensagemBloqueio } = await import("./bloqueios");
  const bloqueio = await verificarBloqueio(p.candidato.cpf, p.empresa_id);
  if (bloqueio) {
    throw new Error(
      `${mensagemBloqueio(bloqueio)} Procure o responsável pelo sistema para liberação.`,
    );
  }
  if (p.status !== "CANCELAMENTO") {
    const repetida = await fichaJaFechada({
      candidato_id: p.candidato.id,
      empresa_id: p.empresa_id,
      data: p.data,
    });
    if (repetida) throw new Error(MSG_FICHA_DUPLICADA);
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
}

export function useCriarProgramacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: criarProgramacao,
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
    { onConflict: "tenant_id,user_id,chave", ignoreDuplicates: true },
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
    { onConflict: "tenant_id,user_id,chave", ignoreDuplicates: true },
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

/**
 * Usuários ativos com acesso efetivo ao módulo "Minha Programação".
 * A lista vem do banco (perfis + permissões + status ativo) e nunca é fixa no código.
 */
export function useProgramadorasHabilitadas() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["programadoras-habilitadas", user?.id],
    // Consulta autenticada: nas telas públicas (portal de diárias) não deve ser disparada.
    enabled: Boolean(user),
    queryFn: async (): Promise<{ id: string; nome: string }[]> => {
      const { data, error } = await supabase.rpc("programadoras_da_programacao");
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
  candidato_id: string | null;
  candidato_nome: string;
  candidato_cpf: string;
  candidato_telefone: string | null;
  candidato_funcao: string;
  candidato_pix: string;
  candidato_documento_path: string;
  candidato_documento_nome: string;
  candidato_transporte_proprio: boolean;
  candidato_transporte_tipos: string[];
  candidato_precisa_fretado: boolean;
  candidato_transporte_observacao: string;
}

export function useMinhasProgramacoes(userId?: string) {
  return useQuery({
    enabled: Boolean(userId),
    queryKey: ["minhas-programacoes", userId],
    queryFn: async (): Promise<RegistroProgramacao[]> => {
      const { data, error } = await supabase
        .from("vagas")
        .select(
          "id,data,status,descricao,observacao,empresas(nome),candidatos(id,nome,cpf,telefone,funcao,pix_chave,documento_path,documento_nome,transporte_proprio,transporte_tipos,precisa_fretado,transporte_observacao)",
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
        candidatos: {
          id: string;
          nome: string;
          cpf: string;
          telefone: string | null;
          funcao: string | null;
          pix_chave: string | null;
          documento_path: string | null;
          documento_nome: string | null;
          transporte_proprio: boolean | null;
          transporte_tipos: string[] | null;
          precisa_fretado: boolean | null;
          transporte_observacao: string | null;
        } | null;
      };
      return ((data ?? []) as unknown as Linha[]).map((l) => ({
        id: l.id,
        data: l.data,
        status: l.status,
        descricao: l.descricao,
        observacao: l.observacao,
        empresa: l.empresas?.nome ?? "—",
        candidato_id: l.candidatos?.id ?? null,
        candidato_funcao: l.candidatos?.funcao ?? "",
        candidato_pix: l.candidatos?.pix_chave ?? "",
        candidato_documento_path: l.candidatos?.documento_path ?? "",
        candidato_documento_nome: l.candidatos?.documento_nome ?? "",
        candidato_nome: l.candidatos?.nome ?? l.descricao ?? "—",
        candidato_cpf: l.candidatos?.cpf ?? "",
        candidato_telefone: l.candidatos?.telefone ?? null,
        candidato_transporte_proprio: l.candidatos?.transporte_proprio ?? false,
        candidato_transporte_tipos: l.candidatos?.transporte_tipos ?? [],
        candidato_precisa_fretado: l.candidatos?.precisa_fretado ?? false,
        candidato_transporte_observacao: l.candidatos?.transporte_observacao ?? "",
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
export async function confirmarProgramacao(p: {
  id: string;
  status: "AGUARDANDO" | "PRESENCA" | "FALTA" | "CANCELAMENTO";
}) {
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
}

export function useConfirmarProgramacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: confirmarProgramacao,
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
