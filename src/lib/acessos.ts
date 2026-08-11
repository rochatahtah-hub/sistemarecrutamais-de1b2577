import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export interface RegistroAcesso {
  id: string;
  user_id: string | null;
  usuario_nome: string;
  login_at: string;
  navegador: string;
  sistema_operacional: string;
}

function ambiente() {
  if (typeof navigator === "undefined") return { navegador: "", sistema: "", agente: "" };
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

/** Registra no banco um login autenticado com sucesso. Nunca lança erro. */
export async function registrarAcesso() {
  try {
    const info = ambiente();
    await supabase.rpc("registrar_acesso", {
      _navegador: info.navegador,
      _sistema_operacional: info.sistema,
      _user_agent: info.agente.slice(0, 1000),
    });
  } catch {
    /* monitoramento nunca pode quebrar o login */
  }
}

/** Texto relativo do último login: "Agora", "Hoje 14:20", "Ontem 09:12", "3 dias atrás". */
export function statusUltimoLogin(valor: string | null | undefined) {
  if (!valor) return "Nunca acessou";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Nunca acessou";
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const minutos = Math.floor((Date.now() - data.getTime()) / 60000);
  if (minutos < 5) return "Agora";
  const hoje = new Date();
  const dia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((dia(hoje) - dia(data)) / 86400000);
  if (diff <= 0) return `Hoje ${hora}`;
  if (diff === 1) return `Ontem ${hora}`;
  return `${diff} dias atrás`;
}

export function dataHoraLogin(valor: string | null | undefined) {
  if (!valor) return "—";
  return new Date(valor).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export interface FiltroAcessos {
  usuarioId?: string | undefined;
  inicio?: string | undefined;
  fim?: string | undefined;
}

/** Histórico de acessos (RLS: admin vê todos, usuário comum vê apenas os próprios). */
export function useAcessos(filtro: FiltroAcessos) {
  return useQuery({
    queryKey: ["acessos", filtro],
    queryFn: async (): Promise<RegistroAcesso[]> => {
      let q = supabase
        .from("user_access_logs")
        .select("id,user_id,usuario_nome,login_at,navegador,sistema_operacional")
        .order("login_at", { ascending: false })
        .limit(500);
      if (filtro.usuarioId) q = q.eq("user_id", filtro.usuarioId);
      if (filtro.inicio) q = q.gte("login_at", `${filtro.inicio}T00:00:00`);
      if (filtro.fim) q = q.lte("login_at", `${filtro.fim}T23:59:59`);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as RegistroAcesso[];
    },
  });
}

export interface ResumoAcessos {
  online: number;
  ultimoUsuario: string | null;
  ultimoAcesso: string | null;
  acessos24h: number;
  acessos7d: number;
}

/** Indicadores de acesso para o painel administrativo. */
export function useResumoAcessos() {
  return useQuery({
    queryKey: ["acessos-resumo"],
    refetchInterval: 60_000,
    queryFn: async (): Promise<ResumoAcessos> => {
      const agora = Date.now();
      const desde7d = new Date(agora - 7 * 86400000).toISOString();
      const { data, error } = await supabase
        .from("user_access_logs")
        .select("user_id,usuario_nome,login_at")
        .gte("login_at", desde7d)
        .order("login_at", { ascending: false })
        .limit(1000);
      if (error) throw new Error(error.message);
      const linhas = data ?? [];
      const online = new Set(
        linhas.filter((l) => agora - new Date(l.login_at).getTime() < 15 * 60000).map((l) => l.user_id),
      ).size;
      const ultimo = linhas[0];
      return {
        online,
        ultimoUsuario: ultimo?.usuario_nome ?? null,
        ultimoAcesso: ultimo?.login_at ?? null,
        acessos24h: linhas.filter((l) => agora - new Date(l.login_at).getTime() < 86400000).length,
        acessos7d: linhas.length,
      };
    },
  });
}