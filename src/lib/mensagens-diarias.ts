import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { mensagemDoDia, type MensagemDiaria, type TipoMensagem } from "./mensagem-do-dia";

export interface MensagemDiariaRegistro extends MensagemDiaria {
  ativa: boolean;
  /** Nulo = mensagem global, vale para todas as empresas. */
  tenantId: string | null;
  criadoPorNome: string;
}

type Linha = {
  id: string;
  tenant_id: string | null;
  texto: string;
  tipo: string;
  referencia: string | null;
  ativa: boolean;
  data_especifica: string | null;
  criado_por_nome: string;
};

function mapear(l: Linha): MensagemDiariaRegistro {
  return {
    id: l.id,
    texto: l.texto,
    tipo: l.tipo as TipoMensagem,
    referencia: l.referencia,
    dataEspecifica: l.data_especifica,
    ativa: l.ativa,
    tenantId: l.tenant_id,
    criadoPorNome: l.criado_por_nome,
  };
}

/** Data de hoje em America/Sao_Paulo — a mesma base de fuso usada no resto do app. */
export function hojeBrasilia(base = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(base);
}

/**
 * A mensagem que acompanha a saudação. A escolha é feita no cliente a partir da
 * lista de ativas — não há sorteio nem gravação: a mesma data sempre resolve
 * para a mesma frase.
 */
export function useMensagemDoDia() {
  const hoje = hojeBrasilia();
  return useQuery({
    queryKey: ["mensagem-do-dia", hoje],
    // A lista muda raramente; não faz sentido rebuscar a cada foco de janela.
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensagens_diarias")
        .select("id,tenant_id,texto,tipo,referencia,ativa,data_especifica,criado_por_nome")
        .eq("ativa", true);
      if (error) throw error;
      return mensagemDoDia((data ?? []).map(mapear), hoje);
    },
  });
}

/** Todas as mensagens visíveis para o usuário (globais + da própria empresa). */
export function useMensagensDiarias() {
  return useQuery({
    queryKey: ["mensagens-diarias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensagens_diarias")
        .select("id,tenant_id,texto,tipo,referencia,ativa,data_especifica,criado_por_nome")
        .order("ativa", { ascending: false })
        .order("tipo")
        .limit(500);
      if (error) throw error;
      return (data ?? []).map(mapear);
    },
  });
}

export interface EntradaMensagem {
  id?: string;
  texto: string;
  tipo: TipoMensagem;
  referencia: string | null;
  dataEspecifica: string | null;
  ativa: boolean;
}

function invalidar(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["mensagens-diarias"] });
  void qc.invalidateQueries({ queryKey: ["mensagem-do-dia"] });
}

/**
 * Grava a mensagem. O tenant nunca vem de um campo da tela: sai da função
 * `tenant_atual()` do banco, e a policy de escrita confere de novo — mandar um
 * id de outra empresa pela requisição não leva a lugar nenhum.
 */
export function useSalvarMensagemDiaria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entrada: EntradaMensagem) => {
      const texto = entrada.texto.trim();
      if (texto.length < 3) throw new Error("Escreva a mensagem.");
      if (texto.length > 280) throw new Error("A mensagem precisa ter no máximo 280 caracteres.");

      const campos = {
        texto,
        tipo: entrada.tipo,
        referencia: entrada.tipo === "versiculo" ? entrada.referencia?.trim() || null : null,
        data_especifica: entrada.dataEspecifica || null,
        ativa: entrada.ativa,
      };

      if (entrada.id) {
        const { error } = await supabase
          .from("mensagens_diarias")
          .update(campos)
          .eq("id", entrada.id);
        if (error) throw error;
        return;
      }

      const [{ data: tenantId }, { data: sessao }] = await Promise.all([
        supabase.rpc("tenant_atual"),
        supabase.auth.getUser(),
      ]);
      const { data: perfil } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", sessao.user?.id ?? "")
        .maybeSingle();

      const { error } = await supabase.from("mensagens_diarias").insert({
        ...campos,
        tenant_id: tenantId,
        criado_por: sessao.user?.id ?? null,
        criado_por_nome: perfil?.nome ?? "",
      });
      if (error) throw error;
    },
    onSuccess: () => invalidar(qc),
  });
}

export function useExcluirMensagemDiaria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mensagens_diarias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidar(qc),
  });
}
