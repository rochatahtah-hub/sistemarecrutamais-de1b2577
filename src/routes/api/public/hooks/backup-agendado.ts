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
 * Chamado de hora em hora pela rotina do banco. Executa a exportação automática
 * apenas quando o agendamento estiver ativo e vencido.
 */
export const Route = createFileRoute("/api/public/hooks/backup-agendado")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Segredo exclusivo do agendador, guardado apenas no banco (nunca enviado ao navegador).
        const chave = request.headers.get("x-cron-secret") ?? "";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: segredo } = await supabaseAdmin
          .from("cron_secrets")
          .select("valor")
          .eq("nome", "backup-agendado")
          .maybeSingle();
        const esperada = segredo?.valor ?? "";
        if (!segredoConfere(chave, esperada)) {
          return new Response(JSON.stringify({ error: "não autorizado" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const { rodarAgendamento } = await import("@/lib/backup.server");
          const resultado = await rodarAgendamento();
          return Response.json({ ok: true, ...resultado });
        } catch (e) {
          console.error("[backup-agendado]", e);
          return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});