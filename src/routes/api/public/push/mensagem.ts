import { createFileRoute } from "@tanstack/react-router";
import { agoraBrasilia, alertaNoHorario, REGRAS_ALERTA, type TipoAlerta } from "@/lib/alertas-push";
import { endpointPushValido } from "@/lib/push-endpoint";

/**
 * O service worker busca aqui o texto do alerta assim que o push chega.
 * Quem conhece o endpoint é o próprio dispositivo (endereço secreto); a
 * mensagem é entregue uma vez e apagada. Só alertas das últimas 2 horas.
 */
export const Route = createFileRoute("/api/public/push/mensagem")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let endpoint = "";
        try {
          endpoint = String(((await request.json()) as { endpoint?: string }).endpoint ?? "").slice(0, 1000);
        } catch {
          /* corpo inválido */
        }
        const headers = { "Cache-Control": "no-store" };
        if (!endpointPushValido(endpoint)) return Response.json({ mensagens: [] }, { headers });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin
          .from("push_usuarios")
          .select("user_id,mensagens,mensagens_em")
          .eq("endpoint", endpoint)
          .eq("status", "ativa")
          .maybeSingle();
        const recente =
          data?.mensagens_em && Date.now() - new Date(data.mensagens_em).getTime() < 2 * 3600 * 1000;
        const { hora, semana } = agoraBrasilia();
        const mensagens = [];
        if (recente && data && Array.isArray(data.mensagens)) {
          const { data: perfil } = await supabaseAdmin.from("profiles")
            .select("ativo,tenant_id,tenants(ativo,status)").eq("id", data.user_id).maybeSingle();
          if (perfil?.ativo && perfil.tenants?.ativo && perfil.tenants.status === "ativo") {
            for (const mensagem of data.mensagens) {
              if (!mensagem || typeof mensagem !== "object" || Array.isArray(mensagem)) continue;
              const tipo = mensagem['tipo'];
              if (typeof tipo !== "string" || !Object.hasOwn(REGRAS_ALERTA, tipo)) continue;
              const regra = REGRAS_ALERTA[tipo as TipoAlerta];
              if (!alertaNoHorario(tipo as TipoAlerta, hora, semana)) continue;
              const { data: pode } = await supabaseAdmin.rpc("tem_permissao", {
                _user_id: data.user_id, _modulo: regra.modulo, _acao: regra.acao,
              });
              if (pode) mensagens.push({ tipo, titulo: regra.titulo, corpo: regra.corpo, url: regra.url });
            }
          }
        }
        if (data?.mensagens_em) {
          // Do not erase a newer batch queued during this read.
          await supabaseAdmin.from("push_usuarios").update({ mensagens: [] })
            .eq("endpoint", endpoint).eq("mensagens_em", data.mensagens_em);
        }
        return Response.json({ mensagens, interno: Boolean(data) }, { headers });
      },
    },
  },
});
