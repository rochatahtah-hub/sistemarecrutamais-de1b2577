import { createFileRoute } from "@tanstack/react-router";
import { REGRAS_ALERTA, type TipoAlerta } from "@/lib/alertas-push";
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
        let mensagens: { tipo: string; titulo: string; corpo: string; url: string }[] = [];
        if (recente && data && Array.isArray(data.mensagens)) {
          const tipos = data.mensagens.flatMap((m) => {
            if (!m || typeof m !== "object" || Array.isArray(m)) return [];
            const tipo = m['tipo'];
            return typeof tipo === "string" && Object.hasOwn(REGRAS_ALERTA, tipo) ? [tipo as TipoAlerta] : [];
          });
          const { alertasAtuaisDoUsuario } = await import("@/lib/alertas-push.server");
          try {
            mensagens = await alertasAtuaisDoUsuario(supabaseAdmin, data.user_id, tipos);
            const { avisoLevantamentoAtual } = await import("@/lib/levantamento-aviso.server");
            for (const item of data.mensagens) {
              if (!item || typeof item !== "object" || Array.isArray(item) || typeof item["notificacaoId"] !== "string") continue;
              const aviso = await avisoLevantamentoAtual(data.user_id, item["notificacaoId"]);
              if (aviso && !mensagens.some(m => m.tipo === aviso.tipo)) mensagens.push(aviso);
            }
          } catch {
            // A failed live check is not evidence of a pending action.
            return Response.json({ mensagens: [], interno: true }, { headers });
          }
        }
        if (data?.mensagens_em) {
          // Do not erase a newer batch queued during this read.
          await supabaseAdmin.from("push_usuarios").update({ mensagens: [] })
            .eq("endpoint", endpoint).eq("mensagens_em", data.mensagens_em);
        }
        const { data: portal, error: erroPortal } = await supabaseAdmin.from("push_inscricoes")
          .select("id").eq("endpoint", endpoint).eq("status", "ativa").maybeSingle();
        return Response.json({ mensagens, interno: Boolean(data) || !portal || Boolean(erroPortal) }, { headers });
      },
    },
  },
});
