import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { endpointPushValido } from "./push-endpoint";
import { fusoValido } from "./alertas-push";

const endpointValido = endpointPushValido;

export const estadoAlertasUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { endpoint: string }) => ({ endpoint: String(d?.endpoint ?? "").slice(0, 1000) }))
  .handler(async ({ data, context }) => {
    const { data: inscricao, error } = await context.supabase.from("push_usuarios")
      .select("status").eq("endpoint", data.endpoint).eq("user_id", context.userId).maybeSingle();
    if (error) throw new Error("Não foi possível consultar as notificações.");
    return { ativo: inscricao?.status === "ativa" };
  });

/** Inscreve o dispositivo do usuário logado para alertas automáticos. */
export const ativarAlertasUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { endpoint: string; fuso?: string }) => ({ endpoint: String(d?.endpoint ?? "").slice(0, 1000), fuso: d.fuso ? fusoValido(d.fuso) : null }))
  .handler(async ({ data, context }) => {
    if (!endpointValido(data.endpoint)) throw new Error("Dispositivo inválido para notificações.");
    const { data: perfil } = await context.supabase
      .from("profiles")
      .select("tenant_id,ativo")
      .eq("id", context.userId)
      .maybeSingle();
    if (!perfil?.ativo || !perfil.tenant_id) throw new Error("Usuário indisponível para notificações.");
    if (data.fuso) {
      const { error: erroFuso } = await context.supabase.from("profiles").update({ fuso_horario: data.fuso }).eq("id", context.userId).is("fuso_horario", null);
      if (erroFuso) throw new Error("Não foi possível salvar o fuso das notificações.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("push_usuarios").upsert(
      {
        user_id: context.userId,
        tenant_id: perfil?.tenant_id ?? null,
        endpoint: data.endpoint,
        status: "ativa",
        mensagens: [],
        mensagens_em: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error("Não foi possível ativar as notificações agora.");
    return { ok: true };
  });

export const desativarAlertasUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { endpoint: string }) => ({ endpoint: String(d?.endpoint ?? "").slice(0, 1000) }))
  .handler(async ({ data, context }) => {
    // RLS: só remove inscrições do próprio usuário.
    const { error } = await context.supabase.from("push_usuarios").delete().eq("endpoint", data.endpoint).eq("user_id", context.userId);
    if (error) throw new Error("Não foi possível desativar as notificações agora.");
    return { ok: true };
  });

/** Explicit device test, scoped to the authenticated user's active subscription. */
export const testarAlertasUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { endpoint: string }) => ({ endpoint: String(d?.endpoint ?? "").slice(0, 1000) }))
  .handler(async ({ data, context }) => {
    if (!endpointValido(data.endpoint)) throw new Error("Dispositivo inválido.");
    const { data: inscricao, error } = await context.supabase.from("push_usuarios")
      .select("id,mensagens_em").eq("endpoint", data.endpoint).eq("user_id", context.userId).eq("status", "ativa").maybeSingle();
    if (error || !inscricao) throw new Error("Ative as notificações neste dispositivo primeiro.");
    if (inscricao.mensagens_em && Date.now() - new Date(inscricao.mensagens_em).getTime() < 60000) throw new Error("Aguarde um minuto antes de testar novamente.");
    const lote = new Date().toISOString();
    const { error: erroFila } = await context.supabase.from("push_usuarios")
      .update({ mensagens: [{ tipo: "teste_dispositivo" }], mensagens_em: lote })
      .eq("id", inscricao.id).eq("user_id", context.userId);
    if (erroFila) throw new Error("Não foi possível preparar o teste.");
    const { enviarAvisoPush } = await import("./push.server");
    const resultado = await enviarAvisoPush([data.endpoint], 120);
    if (!resultado.enviados) throw new Error("O serviço de notificações recusou o envio. Desative e ative as notificações novamente.");
    return { aceito: true };
  });
