import { createFileRoute } from "@tanstack/react-router";


/**
 * Chamado de hora em hora pela rotina do banco. Executa a exportação automática
 * apenas quando o agendamento estiver ativo e vencido.
 */
export const Route = createFileRoute("/api/public/hooks/backup-agendado")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Segredo exclusivo do agendador (nunca enviado ao navegador).
        const chave =
          request.headers.get("x-cron-secret") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
        const esperada = process.env["CRON_WEBHOOK_SECRET"] ?? "";
        if (!esperada || chave.length !== esperada.length || chave !== esperada) {
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