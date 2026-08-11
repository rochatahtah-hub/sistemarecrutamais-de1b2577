import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/* ---------------- Tipos ---------------- */

export interface UsuarioChat {
  id: string;
  nome: string;
  avatar_url: string;
}

export interface Participante {
  id: string;
  conversa_id: string;
  user_id: string;
  admin: boolean;
  last_read_at: string;
}

export interface Conversa {
  id: string;
  tipo: "direta" | "grupo";
  nome: string;
  descricao: string;
  foto_url: string;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface Mensagem {
  id: string;
  conversa_id: string;
  autor_id: string | null;
  conteudo: string;
  responde_a: string | null;
  excluida: boolean;
  created_at: string;
  tipo: TipoMensagem;
  anexo_path: string;
  anexo_nome: string;
  anexo_mime: string;
  anexo_tamanho: number;
  duracao_ms: number;
}

export type TipoMensagem = "texto" | "imagem" | "arquivo" | "audio";

export interface Reacao {
  id: string;
  mensagem_id: string;
  conversa_id: string;
  user_id: string;
  emoji: string;
}

export interface ResumoConversa {
  conversa: Conversa;
  participantes: Participante[];
  outro: UsuarioChat | null;
  titulo: string;
  ultima: Mensagem | null;
  naoLidas: number;
  souAdmin: boolean;
}

export interface Presenca {
  user_id: string;
  online: boolean;
  ultimo_visto: string;
}

export const CHAVE_CONVERSAS = ["chat", "conversas"] as const;

/** Usuários ativos do Recruta+ disponíveis para conversar. */
export function useUsuariosChat() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["chat", "usuarios"],
    queryFn: async ({ signal }): Promise<UsuarioChat[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,nome,avatar_url,ativo")
        .eq("ativo", true)
        .order("nome")
        .abortSignal(signal);
      if (error) throw error;
      return (data ?? []).map((p) => ({
        id: p.id,
        nome: p.nome,
        avatar_url: p.avatar_url ?? "",
      }));
    },
    enabled: !!user,
    staleTime: 60_000,
    retry: false,
  });
}

/** Lista de conversas do usuário com prévia, contagem de não lidas e participantes. */
export function useConversas() {
  const { user } = useAuth();
  const { data: usuarios = [] } = useUsuariosChat();

  return useQuery({
    queryKey: CHAVE_CONVERSAS,
    enabled: !!user,
    retry: false,
    staleTime: 10_000,
    queryFn: async (): Promise<ResumoConversa[]> => {
      if (!user) return [];
      const minhas = await supabase
        .from("conversa_participantes")
        .select("id,conversa_id,user_id,admin,last_read_at")
        .eq("user_id", user.id);
      if (minhas.error) throw minhas.error;
      const ids = (minhas.data ?? []).map((p) => p.conversa_id);
      if (ids.length === 0) return [];

      const [conversas, participantes, mensagens] = await Promise.all([
        supabase.from("conversas").select("*").in("id", ids),
        supabase
          .from("conversa_participantes")
          .select("id,conversa_id,user_id,admin,last_read_at")
          .in("conversa_id", ids),
        supabase
          .from("mensagens")
          .select("*")
          .in("conversa_id", ids)
          .order("created_at", { ascending: false })
          .limit(600),
      ]);
      if (conversas.error) throw conversas.error;
      if (participantes.error) throw participantes.error;
      if (mensagens.error) throw mensagens.error;

      const porUsuario = new Map(usuarios.map((u) => [u.id, u]));
      const msgs = (mensagens.data ?? []) as Mensagem[];

      const lista: ResumoConversa[] = ((conversas.data ?? []) as Conversa[]).map((conversa) => {
        const membros = ((participantes.data ?? []) as Participante[]).filter(
          (p) => p.conversa_id === conversa.id,
        );
        const eu = membros.find((p) => p.user_id === user.id);
        const outroId = membros.find((p) => p.user_id !== user.id)?.user_id ?? null;
        const outro =
          conversa.tipo === "direta" && outroId ? (porUsuario.get(outroId) ?? null) : null;
        const daConversa = msgs.filter((m) => m.conversa_id === conversa.id);
        const ultima = daConversa[0] ?? null;
        const lidoEm = eu ? new Date(eu.last_read_at).getTime() : 0;
        const naoLidas = daConversa.filter(
          (m) => m.autor_id !== user.id && new Date(m.created_at).getTime() > lidoEm,
        ).length;
        return {
          conversa,
          participantes: membros,
          outro,
          titulo:
            conversa.tipo === "grupo" ? conversa.nome || "Grupo" : (outro?.nome ?? "Conversa"),
          ultima,
          naoLidas,
          souAdmin: !!eu?.admin,
        };
      });

      return lista.sort((a, b) => {
        const ta = new Date(a.ultima?.created_at ?? a.conversa.created_at).getTime();
        const tb = new Date(b.ultima?.created_at ?? b.conversa.created_at).getTime();
        return tb - ta;
      });
    },
  });
}

export function useTotalNaoLidas() {
  const { data = [] } = useConversas();
  return data.reduce((total, c) => total + c.naoLidas, 0);
}

/** Mensagens de uma conversa, em ordem cronológica. */
export function useMensagens(conversaId: string | null) {
  return useQuery({
    queryKey: ["chat", "mensagens", conversaId],
    enabled: !!conversaId,
    retry: false,
    staleTime: 5_000,
    queryFn: async ({ signal }): Promise<Mensagem[]> => {
      const { data, error } = await supabase
        .from("mensagens")
        .select("*")
        .eq("conversa_id", conversaId!)
        .order("created_at", { ascending: true })
        .abortSignal(signal);
      if (error) throw error;
      return (data ?? []) as Mensagem[];
    },
  });
}

export function useEnviarMensagem() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (dados: {
      conversaId: string;
      conteudo: string;
      respondeA?: string | null;
    }) => {
      if (!user) throw new Error("Sessão expirada.");
      const { error } = await supabase.from("mensagens").insert({
        conversa_id: dados.conversaId,
        autor_id: user.id,
        conteudo: dados.conteudo,
        responde_a: dados.respondeA ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ["chat", "mensagens", v.conversaId] });
      void qc.invalidateQueries({ queryKey: CHAVE_CONVERSAS });
    },
  });
}

export function useExcluirMensagem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: { id: string; conversaId: string }) => {
      const { error } = await supabase
        .from("mensagens")
        .update({ conteudo: "", excluida: true })
        .eq("id", dados.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ["chat", "mensagens", v.conversaId] });
      void qc.invalidateQueries({ queryKey: CHAVE_CONVERSAS });
    },
  });
}

export function useMarcarLida() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (conversaId: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("conversa_participantes")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversa_id", conversaId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: CHAVE_CONVERSAS }),
  });
}

/** Abre (ou reaproveita) a conversa individual com outro usuário. */
export function useAbrirConversaDireta() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (outroId: string): Promise<string> => {
      if (!user) throw new Error("Sessão expirada.");
      const chave = [user.id, outroId].sort().join(":");
      const existente = await supabase
        .from("conversas")
        .select("id")
        .eq("chave_direta", chave)
        .maybeSingle();
      if (existente.data?.id) return existente.data.id;

      const criada = await supabase
        .from("conversas")
        .insert({ tipo: "direta", chave_direta: chave, criado_por: user.id })
        .select("id")
        .single();
      if (criada.error) throw criada.error;
      const conversaId = criada.data.id;
      const { error } = await supabase.from("conversa_participantes").insert([
        { conversa_id: conversaId, user_id: user.id, admin: true },
        { conversa_id: conversaId, user_id: outroId, admin: false },
      ]);
      if (error) throw error;
      return conversaId;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: CHAVE_CONVERSAS }),
  });
}

export function useCriarGrupo() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (dados: {
      nome: string;
      descricao: string;
      membros: string[];
      foto?: File | null;
    }): Promise<string> => {
      if (!user) throw new Error("Sessão expirada.");
      let fotoPath = "";
      const criada = await supabase
        .from("conversas")
        .insert({
          tipo: "grupo",
          nome: dados.nome,
          descricao: dados.descricao,
          criado_por: user.id,
        })
        .select("id")
        .single();
      if (criada.error) throw criada.error;
      const conversaId = criada.data.id;

      const membros = Array.from(new Set([user.id, ...dados.membros]));
      const { error } = await supabase
        .from("conversa_participantes")
        .insert(
          membros.map((id) => ({ conversa_id: conversaId, user_id: id, admin: id === user.id })),
        );
      if (error) throw error;

      if (dados.foto) {
        fotoPath = await enviarFotoGrupo(conversaId, dados.foto);
        await supabase.from("conversas").update({ foto_url: fotoPath }).eq("id", conversaId);
      }
      return conversaId;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: CHAVE_CONVERSAS }),
  });
}

export async function enviarFotoGrupo(conversaId: string, arquivo: File) {
  const ext = (arquivo.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const caminho = `grupos/${conversaId}/foto-${Date.now()}.${ext || "jpg"}`;
  const { error } = await supabase.storage
    .from("chat")
    .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type || "image/jpeg" });
  if (error) throw error;
  return caminho;
}

export function useAtualizarGrupo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: {
      conversaId: string;
      nome?: string;
      descricao?: string;
      foto?: File | null;
    }) => {
      const patch: { nome?: string; descricao?: string; foto_url?: string } = {};
      if (dados.nome !== undefined) patch.nome = dados.nome;
      if (dados.descricao !== undefined) patch.descricao = dados.descricao;
      if (dados.foto) patch.foto_url = await enviarFotoGrupo(dados.conversaId, dados.foto);
      if (Object.keys(patch).length === 0) return;
      const { error } = await supabase.from("conversas").update(patch).eq("id", dados.conversaId);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: CHAVE_CONVERSAS }),
  });
}

export function useGerenciarParticipantes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: { conversaId: string; adicionar?: string[]; remover?: string[] }) => {
      if (dados.adicionar?.length) {
        const { error } = await supabase
          .from("conversa_participantes")
          .insert(dados.adicionar.map((id) => ({ conversa_id: dados.conversaId, user_id: id })));
        if (error) throw error;
      }
      if (dados.remover?.length) {
        const { error } = await supabase
          .from("conversa_participantes")
          .delete()
          .eq("conversa_id", dados.conversaId)
          .in("user_id", dados.remover);
        if (error) throw error;
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: CHAVE_CONVERSAS }),
  });
}

/** Sair da conversa. Quando o último participante sai, a conversa é apagada. */
export function useSairDaConversa() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (conversaId: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("conversa_participantes")
        .delete()
        .eq("conversa_id", conversaId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: CHAVE_CONVERSAS }),
  });
}

/* ---------------- Presença ---------------- */

const LIMITE_ONLINE = 2 * 60_000;

export function usePresencas() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["chat", "presenca"],
    enabled: !!user,
    retry: false,
    refetchInterval: 60_000,
    queryFn: async ({ signal }): Promise<Record<string, Presenca>> => {
      const { data, error } = await supabase
        .from("presenca_usuarios")
        .select("user_id,online,ultimo_visto")
        .abortSignal(signal);
      if (error) throw error;
      const mapa: Record<string, Presenca> = {};
      for (const p of data ?? []) mapa[p.user_id] = p as Presenca;
      return mapa;
    },
  });
}

export function estaOnline(p?: Presenca) {
  if (!p) return false;
  return p.online && Date.now() - new Date(p.ultimo_visto).getTime() < LIMITE_ONLINE;
}

export function textoPresenca(p?: Presenca) {
  if (estaOnline(p)) return "Online";
  if (!p) return "Offline";
  const d = new Date(p.ultimo_visto);
  const hoje = new Date().toDateString() === d.toDateString();
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return hoje
    ? `Visto por último hoje às ${hora}`
    : `Visto por último em ${d.toLocaleDateString("pt-BR")} às ${hora}`;
}

/** Mantém o status online do usuário atual atualizado enquanto ele usa o sistema. */
export function usePresencaAtiva() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    let ativo = true;
    const marcar = async (online: boolean) => {
      if (!ativo) return;
      await supabase
        .from("presenca_usuarios")
        .upsert(
          { user_id: user.id, online, ultimo_visto: new Date().toISOString() },
          { onConflict: "user_id" },
        );
    };
    void marcar(true);
    const id = window.setInterval(() => void marcar(true), 45_000);
    const sair = () => void marcar(false);
    window.addEventListener("beforeunload", sair);
    return () => {
      ativo = false;
      window.clearInterval(id);
      window.removeEventListener("beforeunload", sair);
      void supabase
        .from("presenca_usuarios")
        .upsert(
          { user_id: user.id, online: false, ultimo_visto: new Date().toISOString() },
          { onConflict: "user_id" },
        );
    };
  }, [user]);
}

/* ---------------- Tempo real ---------------- */

/**
 * Assina as mudanças do chat em tempo real e mantém as listas atualizadas.
 * `conversaAberta` evita notificar mensagens da conversa que já está na tela.
 */
let conversaAbertaGlobal: string | null = null;

/** Registra qual conversa está aberta na tela (evita notificar o que já está visível). */
export function useConversaAberta(id: string | null) {
  useEffect(() => {
    conversaAbertaGlobal = id;
    return () => {
      conversaAbertaGlobal = null;
    };
  }, [id]);
}

export function useChatRealtime() {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const canal = supabase
      .channel("chat-recruta")
      .on("postgres_changes", { event: "*", schema: "public", table: "mensagens" }, (payload) => {
        const nova = payload.new as Mensagem | null;
        const conversaId = nova?.conversa_id ?? (payload.old as Mensagem | null)?.conversa_id;
        if (conversaId) {
          void qc.invalidateQueries({ queryKey: ["chat", "mensagens", conversaId] });
        }
        void qc.invalidateQueries({ queryKey: CHAVE_CONVERSAS });
        if (
          payload.eventType === "INSERT" &&
          nova &&
          nova.autor_id !== user.id &&
          nova.conversa_id !== conversaAbertaGlobal
        ) {
          toast.message("💬 Nova mensagem", {
            id: `chat-${nova.conversa_id}`,
            description: "Você recebeu uma nova mensagem no chat interno.",
          });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversas" }, () => {
        void qc.invalidateQueries({ queryKey: CHAVE_CONVERSAS });
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversa_participantes" },
        () => void qc.invalidateQueries({ queryKey: CHAVE_CONVERSAS }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "presenca_usuarios" }, () => {
        void qc.invalidateQueries({ queryKey: ["chat", "presenca"] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [qc, user]);
}

/** URL assinada para imagens do bucket do chat (fotos de grupo). */
export function useFotoChat(caminho?: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let ativo = true;
    if (!caminho) {
      setUrl(null);
      return;
    }
    const memo = cacheFotos.get(caminho);
    if (memo) {
      setUrl(memo);
      return;
    }
    void supabase.storage
      .from("chat")
      .createSignedUrl(caminho, 60 * 60 * 12)
      .then(({ data }) => {
        if (!ativo || !data?.signedUrl) return;
        cacheFotos.set(caminho, data.signedUrl);
        setUrl(data.signedUrl);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [caminho]);
  return url;
}

const cacheFotos = new Map<string, string>();

export function useMapaUsuarios() {
  const { data = [] } = useUsuariosChat();
  return useMemo(() => new Map(data.map((u) => [u.id, u])), [data]);
}

export function horaCurta(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function diaLegivel(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) return "Hoje";
  const ontem = new Date(hoje.getTime() - 86_400_000);
  if (d.toDateString() === ontem.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR");
}
