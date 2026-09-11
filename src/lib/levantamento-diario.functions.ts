import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Gera (se ainda não existir) ou reprocessa o Levantamento Diário de uma
 * data. Único caminho de escrita manual — usa `supabaseAdmin` internamente
 * (precisa da transação DELETE+INSERT no detalhe por programador), por isso
 * a checagem de permissão aqui é obrigatória: a policy do banco não entra em
 * jogo nesse caminho específico.
 */
export const reprocessarLevantamentoDiario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { dataReferencia: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: pode } = await context.supabase.rpc("tem_permissao", {
      _user_id: context.userId,
      _modulo: "levantamento_diario",
      _acao: "reprocessar",
    });
    if (!pode) throw new Error("Você não tem permissão para reprocessar o Levantamento Diário.");

    const { data: tenantId } = await context.supabase.rpc("tenant_atual");
    if (!tenantId) throw new Error("Não foi possível identificar a empresa ativa.");

    const { data: perfil } = await context.supabase
      .from("profiles")
      .select("nome")
      .eq("id", context.userId)
      .maybeSingle();

    const { gerarOuReprocessarLevantamento } = await import("./levantamento-diario.server");
    return gerarOuReprocessarLevantamento({
      tenantId,
      dataReferencia: data.dataReferencia,
      origem: "usuario",
      usuarioId: context.userId,
      usuarioNome: perfil?.nome ?? "Usuário",
    });
  });

/** Altera o horário (0-23, em America/Sao_Paulo) da geração automática. */
export const salvarConfigLevantamentoDiario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { horaGeracao: number; ativo: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { data: pode } = await context.supabase.rpc("tem_permissao", {
      _user_id: context.userId,
      _modulo: "levantamento_diario",
      _acao: "configurar",
    });
    if (!pode) throw new Error("Você não tem permissão para configurar o Levantamento Diário.");
    if (data.horaGeracao < 0 || data.horaGeracao > 23) {
      throw new Error("Horário inválido.");
    }

    const { data: tenantId } = await context.supabase.rpc("tenant_atual");
    if (!tenantId) throw new Error("Não foi possível identificar a empresa ativa.");

    const { error } = await context.supabase
      .from("levantamento_diario_config")
      .upsert(
        { tenant_id: tenantId, hora_geracao: data.horaGeracao, ativo: data.ativo },
        { onConflict: "tenant_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
