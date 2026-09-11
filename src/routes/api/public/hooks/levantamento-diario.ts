import { createFileRoute } from "@tanstack/react-router";

/** Comparação de tempo constante: não revela o segredo por diferença de tempo. */
function segredoConfere(recebido: string, esperado: string) {
  if (!esperado || recebido.length !== esperado.length) return false;
  let diferenca = 0;
  for (let i = 0; i < esperado.length; i += 1) {
    diferenca |= recebido.charCodeAt(i) ^ esperado.charCodeAt(i);
  }
  return diferenca === 0;
}

/**
 * Chamado a cada ~15 minutos pelo pg_cron. Para cada tenant com o módulo
 * ativo, gera o Levantamento Diário do dia anterior assim que passar do
 * horário configurado — sem depender de navegador aberto ou usuário logado.
 */
export const Route = createFileRoute("/api/public/hooks/levantamento-diario")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const chave = request.headers.get("x-cron-secret") ?? "";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: segredo } = await supabaseAdmin
          .from("cron_secrets")
          .select("valor")
          .eq("nome", "levantamento-diario")
          .maybeSingle();
        const esperada = segredo?.valor ?? "";
        if (!segredoConfere(chave, esperada)) {
          return new Response(JSON.stringify({ error: "não autorizado" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const { rodarLevantamentoDiarioAutomatico } =
            await import("@/lib/levantamento-diario.server");
          const resultado = await rodarLevantamentoDiarioAutomatico();
          return Response.json({ ok: true, ...resultado });
        } catch (e) {
          console.error("[levantamento-diario]", e);
          return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
