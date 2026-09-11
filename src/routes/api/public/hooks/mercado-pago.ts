import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/mercado-pago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { processarWebhookMercadoPago } = await import("@/lib/mercadopago-webhook.server");
        return processarWebhookMercadoPago(request);
      },
    },
  },
});