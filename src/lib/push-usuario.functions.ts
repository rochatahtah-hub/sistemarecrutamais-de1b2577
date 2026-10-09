import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { endpointPushValido } from "./push-endpoint";

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
  .inputValidator((d: { endpoint: string }) => ({ endpoint: String(d?.endpoint ?? "").slice(0, 1000) }))
  .handler(async ({ data, context }) => {
    if (!endpointValido(data.endpoint)) throw new Error("Dispositivo inválido para notificações.");
    const { data: perfil } = await context.supabase
      .from("profiles")
      .select("tenant_id,ativo")
      .eq("id", context.userId)
      .maybeSingle();
    if (!perfil?.ativo || !perfil.tenant_id) throw new Error("Usuário indisponível para notificações.");
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
