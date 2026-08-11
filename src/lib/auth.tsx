import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export interface Perfil {
  id: string;
  nome: string;
  email: string | null;
  ativo: boolean;
  meta_quinzena: number;
  avatar_url: string;
  ultimo_acesso: string | null;
  ultimo_preenchimento: string | null;
}

interface AuthCtx {
  carregando: boolean;
  session: Session | null;
  user: User | null;
  perfil: Perfil | null;
  isAdmin: boolean;
  recarregarPerfil: () => Promise<void>;
  sair: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const carregarPerfil = useCallback(async (uid: string) => {
    const [p, r] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,nome,email,ativo,meta_quinzena,avatar_url,ultimo_acesso,ultimo_preenchimento")
        .eq("id", uid)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setPerfil((p.data as Perfil | null) ?? null);
    setIsAdmin((r.data ?? []).some((x) => x.role === "admin"));
    // Usuário desativado não permanece com sessão ativa.
    if (p.data && (p.data as Perfil).ativo === false) {
      await supabase.auth.signOut();
    }
  }, []);

  useEffect(() => {
    let ativo = true;
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      if (!ativo || (evento !== "SIGNED_IN" && evento !== "SIGNED_OUT" && evento !== "USER_UPDATED" && evento !== "TOKEN_REFRESHED" && evento !== "INITIAL_SESSION")) return;
      setSession(s);
      if (!s) {
        setPerfil(null);
        setIsAdmin(false);
        if (evento === "SIGNED_OUT") qc.clear();
        return;
      }
      window.setTimeout(() => {
        if (!ativo) return;
        void carregarPerfil(s.user.id);
        if (evento === "SIGNED_IN") {
          void import("./acessos").then((m) => m.registrarAcesso());
        }
      }, 0);
    });

    void supabase.auth.getUser().then(async ({ data, error }) => {
      if (!ativo) return;
      if (error || !data.user) {
        setSession(null);
        setPerfil(null);
        setIsAdmin(false);
        setCarregando(false);
        return;
      }
      const { data: sessao } = await supabase.auth.getSession();
      if (!ativo) return;
      setSession(sessao.session);
      await carregarPerfil(data.user.id);
      if (ativo) setCarregando(false);
    });

    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, [carregarPerfil, qc]);

  const valor = useMemo<AuthCtx>(
    () => ({
      carregando,
      session,
      user: session?.user ?? null,
      perfil,
      isAdmin,
      recarregarPerfil: async () => {
        if (session) await carregarPerfil(session.user.id);
      },
      sair: async () => {
        await qc.cancelQueries();
        qc.clear();
        await supabase.auth.signOut();
      },
    }),
    [carregando, session, perfil, isAdmin, carregarPerfil, qc],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}
