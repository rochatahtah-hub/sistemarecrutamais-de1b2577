import { createFileRoute } from "@tanstack/react-router";

function segredoConfere(recebido: string, esperado: string) {
  if (!esperado || recebido.length !== esperado.length) return false;
  let d = 0;
  for (let i = 0; i < esperado.length; i += 1) d |= recebido.charCodeAt(i) ^ esperado.charCodeAt(i);
  return d === 0;
}

/** Verificação horária contínua: alertas operacionais não têm janelas fixas. */
export const Route = createFileRoute("/api/public/hooks/alertas-push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const chave = request.headers.get("x-cron-secret") ?? "";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin
          .from("cron_secrets")
          .select("valor")
          .eq("nome", "alertas-push")
          .maybeSingle();
        if (!segredoConfere(chave, data?.valor ?? "")) {
          return Response.json({ error: "não autorizado" }, { status: 401 });
        }
        try {
          const { rodarAlertasPush } = await import("@/lib/alertas-push.server");
          return Response.json({ ok: true, ...(await rodarAlertasPush()) });
        } catch (e) {
          console.error("[alertas-push]", e);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
