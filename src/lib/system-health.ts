import { supabase } from "@/integrations/supabase/client";

export type CategoriaErro = "frontend" | "autenticacao" | "banco" | "api";

export interface ErroSistema {
  id: string;
  pagina: string;
  componente: string;
  operacao: string;
  endpoint: string;
  codigo_http: number | null;
  categoria: CategoriaErro;
  mensagem: string;
  navegador: string;
  sistema_operacional: string;
  ocorrencias: number;
  primeira_ocorrencia: string;
  ultima_ocorrencia: string;
  status: "pendente" | "resolvido";
  resolvido_por_nome: string;
  resolvido_em: string | null;
  arquivado_em: string | null;
}

interface ErrosQuery {
  select: (columns: string) => ErrosQuery;
  order: (column: string, options: { ascending: boolean }) => ErrosQuery;
  limit: (count: number) => Promise<{ data: ErroSistema[] | null; error: { message: string } | null }>;
}

type DiagnosticsSupabase = {
  from: (table: "erros_sistema") => ErrosQuery;
  rpc: (
    fn: "registrar_erro_sistema",
    args: Record<string, string | number | null>,
  ) => Promise<{ error: { message: string } | null }>;
};

const diagnosticsDb = supabase as unknown as DiagnosticsSupabase;

function ambiente() {
  if (typeof navigator === "undefined") {
    return { navegador: "", sistema: "", agente: "" };
  }
  const agente = navigator.userAgent;
  const navegador = /Edg\//.test(agente)
    ? "Edge"
    : /Chrome\//.test(agente)
      ? "Chrome"
      : /Firefox\//.test(agente)
        ? "Firefox"
        : /Safari\//.test(agente)
          ? "Safari"
          : "Outro";
  const sistema = /Windows/.test(agente)
    ? "Windows"
    : /Android/.test(agente)
      ? "Android"
      : /iPhone|iPad/.test(agente)
        ? "iOS"
        : /Mac OS/.test(agente)
          ? "macOS"
          : /Linux/.test(agente)
            ? "Linux"
            : "Outro";
  return { navegador, sistema, agente };
}

function textoErro(error: unknown) {
  if (error instanceof Response) {
    return { mensagem: `HTTP ${error.status}`, status: error.status, stack: "" };
  }
  if (error instanceof Error) {
    const status = (error as Error & { status?: number; statusCode?: number }).status ??
      (error as Error & { statusCode?: number }).statusCode ?? null;
    return { mensagem: error.message || error.name, status, stack: error.stack ?? "" };
  }
  return { mensagem: String(error), status: null, stack: "" };
}

function hash(input: string) {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0).toString(16);
}

const enviados = new Map<string, number>();

export async function registrarErroSistema(
  error: unknown,
  contexto: {
    componente?: string;
    operacao?: string;
    endpoint?: string;
    categoria?: CategoriaErro;
  } = {},
) {
  if (typeof window === "undefined") return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  const detalhe = textoErro(error);
  const categoria =
    contexto.categoria ?? (detalhe.status === 401 ? "autenticacao" : "frontend");
  const base = `${categoria}|${contexto.componente ?? ""}|${contexto.operacao ?? ""}|${detalhe.status ?? ""}|${detalhe.mensagem.slice(0, 300)}`;
  const fingerprint = hash(base);
  const ultimo = enviados.get(fingerprint) ?? 0;
  if (Date.now() - ultimo < 10_000) return;
  enviados.set(fingerprint, Date.now());
  const info = ambiente();
  const { error: persistencia } = await diagnosticsDb.rpc("registrar_erro_sistema", {
    _fingerprint: fingerprint,
    _pagina: window.location.pathname,
    _componente: contexto.componente ?? "",
    _operacao: contexto.operacao ?? "",
    _endpoint: contexto.endpoint ?? "",
    _codigo_http: detalhe.status,
    _categoria: categoria,
    _mensagem: detalhe.mensagem,
    _stack: detalhe.stack,
    _navegador: info.navegador,
    _sistema_operacional: info.sistema,
    _user_agent: info.agente,
  });
  if (persistencia) console.warn("[saude] diagnóstico não persistido", persistencia.message);
}

export async function listarErrosSistema(): Promise<ErroSistema[]> {
  const { data, error } = await supabase
    .from("erros_sistema")
    .select(
      "id,pagina,componente,operacao,endpoint,codigo_http,categoria,mensagem,navegador,sistema_operacional,ocorrencias,primeira_ocorrencia,ultima_ocorrencia,status,resolvido_por_nome,resolvido_em,arquivado_em",
    )
    .is("arquivado_em", null)
    .order("ultima_ocorrencia", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as ErroSistema[];
}

export async function definirErroResolvido(id: string, resolvido: boolean) {
  const { error } = await supabase.rpc("definir_status_erro_sistema", {
    _id: id,
    _resolvido: resolvido,
  });
  if (error) throw new Error(error.message);
}

export async function arquivarErrosResolvidos(id?: string) {
  const { data, error } = await supabase.rpc("arquivar_erros_resolvidos", { _id: id });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}