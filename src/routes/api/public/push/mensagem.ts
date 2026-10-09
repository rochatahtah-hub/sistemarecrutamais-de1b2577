import { createFileRoute } from "@tanstack/react-router";

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
        if (!endpoint.startsWith("https://")) return Response.json({ mensagens: [] });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin
          .from("push_usuarios")
          .select("mensagens,mensagens_em")
          .eq("endpoint", endpoint)
          .eq("status", "ativa")
          .maybeSingle();
        const recente =
          data?.mensagens_em && Date.now() - new Date(data.mensagens_em).getTime() < 2 * 3600 * 1000;
        const mensagens = recente && Array.isArray(data?.mensagens) ? data.mensagens : [];
        if (data) {
          await supabaseAdmin.from("push_usuarios").update({ mensagens: [] }).eq("endpoint", endpoint);
        }
        return Response.json({ mensagens }, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
