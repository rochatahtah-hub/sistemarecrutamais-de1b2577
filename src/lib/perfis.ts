import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Acao } from "@/lib/permissoes";

export interface PerfilAcesso {
  id: string;
  chave: string;
  nome: string;
  descricao: string;
  sistema: boolean;
}

export interface PermissaoPerfil {
  id: string;
  perfil_id: string;
  modulo: string;
  acao: string;
  permitido: boolean;
}

export function usePerfisAcesso() {
  return useQuery({
    queryKey: ["perfis-acesso"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfis_acesso")
        .select("id,chave,nome,descricao,sistema")
        .order("sistema", { ascending: false })
        .order("nome");
      if (error) throw error;
      return (data ?? []) as PerfilAcesso[];
    },
  });
}

export function usePermissoesPerfil(perfilId: string | null) {
  return useQuery({
    queryKey: ["perfil-permissoes", perfilId],
    enabled: !!perfilId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfil_permissoes")
        .select("id,perfil_id,modulo,acao,permitido")
        .eq("perfil_id", perfilId!);
      if (error) throw error;
      const mapa = new Map<string, boolean>();
      for (const p of (data ?? []) as PermissaoPerfil[]) mapa.set(`${p.modulo}:${p.acao}`, p.permitido);
      return mapa;
    },
  });
}

export function useSalvarPermissaoPerfil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { perfilId: string; modulo: string; acao: Acao; permitido: boolean }) => {
      const { error } = await supabase
        .from("perfil_permissoes")
        .upsert(
          { perfil_id: p.perfilId, modulo: p.modulo, acao: p.acao, permitido: p.permitido },
          { onConflict: "perfil_id,modulo,acao" },
        );
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ["perfil-permissoes", v.perfilId] });
      void qc.invalidateQueries({ queryKey: ["permissoes"] });
    },
  });
}

export function useCriarPerfil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { nome: string; descricao: string; duplicarDe?: string | null }) => {
      const chave = p.nome
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
      if (!chave) throw new Error("Informe um nome válido para o perfil.");
      const { data, error } = await supabase
        .from("perfis_acesso")
        .insert({ chave, nome: p.nome.trim(), descricao: p.descricao.trim() })
        .select("id")
        .single();
      if (error) {
        if (error.code === "23505") throw new Error("Já existe um perfil com esse nome.");
        throw error;
      }
      if (p.duplicarDe) {
        const { data: base } = await supabase
          .from("perfil_permissoes")
          .select("modulo,acao,permitido")
          .eq("perfil_id", p.duplicarDe);
        if (base?.length) {
          await supabase
            .from("perfil_permissoes")
            .insert(base.map((b) => ({ ...b, perfil_id: data.id })));
        }
      }
      return data.id as string;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["perfis-acesso"] }),
  });
}

export function useExcluirPerfil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("perfis_acesso").delete().eq("id", id).eq("sistema", false);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["perfis-acesso"] });
      void qc.invalidateQueries({ queryKey: ["permissoes"] });
    },
  });
}

export interface UsuarioPermissao {
  id: string;
  nome: string;
  email: string | null;
  ativo: boolean;
  master: boolean;
  perfil_id: string | null;
}

export function useUsuariosPermissao() {
  return useQuery({
    queryKey: ["usuarios-permissao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,nome,email,ativo,master,perfil_id")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as UsuarioPermissao[];
    },
  });
}

export function useDefinirPerfilDoUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { userId: string; perfilId: string | null }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ perfil_id: p.perfilId })
        .eq("id", p.userId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["usuarios-permissao"] });
      void qc.invalidateQueries({ queryKey: ["permissoes"] });
      void qc.invalidateQueries({ queryKey: ["programadoras-habilitadas"] });
    },
  });
}

export function useDefinirMaster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { userId: string; master: boolean }) => {
      const { error } = await supabase.from("profiles").update({ master: p.master }).eq("id", p.userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["usuarios-permissao"] });
      void qc.invalidateQueries({ queryKey: ["permissoes"] });
    },
  });
}

export function useExcecoesUsuario(userId: string | null) {
  return useQuery({
    queryKey: ["excecoes-usuario", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissoes_usuario")
        .select("modulo,acao,permitido")
        .eq("user_id", userId!);
      if (error) throw error;
      const mapa = new Map<string, boolean>();
      for (const p of data ?? []) mapa.set(`${p.modulo}:${p.acao}`, p.permitido);
      return mapa;
    },
  });
}

export function useSalvarExcecaoUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      userId: string;
      modulo: string;
      acao: Acao;
      permitido: boolean | null;
    }) => {
      if (p.permitido === null) {
        const { error } = await supabase
          .from("permissoes_usuario")
          .delete()
          .eq("user_id", p.userId)
          .eq("modulo", p.modulo)
          .eq("acao", p.acao);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("permissoes_usuario")
        .upsert(
          { user_id: p.userId, modulo: p.modulo, acao: p.acao, permitido: p.permitido },
          { onConflict: "user_id,modulo,acao" },
        );
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ["excecoes-usuario", v.userId] });
      void qc.invalidateQueries({ queryKey: ["permissoes"] });
      void qc.invalidateQueries({ queryKey: ["programadoras-habilitadas"] });
    },
  });
}