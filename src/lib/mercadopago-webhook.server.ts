import { randomBytes } from "crypto";

import { assinaturaMercadoPagoValida, hashTokenCadastro, mercadoPagoFetch } from "./comercial.server";

type PagamentoMercadoPago = {
  id: number;
  status: string;
  external_reference?: string;
  transaction_amount?: number;
  payment_type_id?: string;
  date_approved?: string;
};

export async function processarWebhookMercadoPago(request: Request) {
  const url = new URL(request.url);
  const corpo = (await request.json().catch(() => ({}))) as { data?: { id?: string | number }; type?: string; action?: string };
  const dataId = String(url.searchParams.get("data.id") ?? corpo.data?.id ?? "");
  const requestId = request.headers.get("x-request-id") ?? "";
  const assinatura = request.headers.get("x-signature") ?? "";
  const segredo = process.env["MERCADOPAGO_WEBHOOK_SECRET"] ?? "";
  if (!assinaturaMercadoPagoValida({ assinatura, requestId, dataId, segredo })) {
    return new Response("não autorizado", { status: 401 });
  }
  if (!dataId) return Response.json({ ok: true, ignorado: true });

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const eventoChave = `${corpo.type ?? "payment"}:${dataId}:${requestId}`;
  const { error: erroEvento } = await supabaseAdmin.from("webhook_eventos_comerciais").insert({
    evento_chave: eventoChave,
    tipo: corpo.type ?? corpo.action ?? "payment",
    payload_minimo: { data_id: dataId, request_id: requestId },
  });
  if (erroEvento?.code === "23505") return Response.json({ ok: true, repetido: true });
  if (erroEvento) return Response.json({ ok: false }, { status: 500 });

  try {
    const pagamento = await mercadoPagoFetch<PagamentoMercadoPago>(`/v1/payments/${encodeURIComponent(dataId)}`);
    const referencia = pagamento.external_reference ?? "";
    const { data: pedido } = await supabaseAdmin
      .from("pedidos_comerciais")
      .select("id,lead_id,plano_id,valor_centavos,status,tenant_id,forma_pagamento")
      .eq("referencia", referencia)
      .maybeSingle();
    if (!pedido || Math.round((pagamento.transaction_amount ?? 0) * 100) !== pedido.valor_centavos) {
      await supabaseAdmin.from("webhook_eventos_comerciais").update({ status_processamento: "ignorado", processado_em: new Date().toISOString() }).eq("evento_chave", eventoChave);
      return Response.json({ ok: true, ignorado: true });
    }

    const aprovado = pagamento.status === "approved";
    const statusPedido = aprovado ? "aprovado" : pagamento.status === "refunded" ? "estornado" : pagamento.status === "rejected" ? "recusado" : "aguardando_pagamento";
    await supabaseAdmin.from("pagamentos_comerciais").upsert({
      pedido_id: pedido.id,
      tenant_id: pedido.tenant_id,
      provedor_pagamento_id: String(pagamento.id),
      idempotency_key: `mp:${pagamento.id}`,
      valor_centavos: pedido.valor_centavos,
      forma_pagamento: pedido.forma_pagamento,
      status: pagamento.status,
      pago_em: pagamento.date_approved ?? null,
      dados_seguros: { payment_type_id: pagamento.payment_type_id ?? null },
    }, { onConflict: "provedor,provedor_pagamento_id" });
    await supabaseAdmin.from("pedidos_comerciais").update({ status: statusPedido }).eq("id", pedido.id);

    if (aprovado) {
      const token = randomBytes(32).toString("hex");
      await supabaseAdmin.from("liberacoes_cadastro").upsert({
        pedido_id: pedido.id,
        token_hash: hashTokenCadastro(token),
        expira_em: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: "pedido_id" });
      await supabaseAdmin.from("leads_comerciais").update({ status: "convertido" }).eq("id", pedido.lead_id);
      const { provisionarPedidoAprovado } = await import("./provisionamento-comercial.server");
      await provisionarPedidoAprovado(pedido.id);
      console.info("[mercado-pago] pagamento aprovado e empresa provisionada", pedido.id);
    }
    await supabaseAdmin.from("webhook_eventos_comerciais").update({ status_processamento: "processado", processado_em: new Date().toISOString() }).eq("evento_chave", eventoChave);
    return Response.json({ ok: true });
  } catch (erro) {
    console.error("[mercado-pago-webhook]", erro);
    await supabaseAdmin.from("webhook_eventos_comerciais").update({ status_processamento: "erro", erro: erro instanceof Error ? erro.message.slice(0, 500) : "erro", processado_em: new Date().toISOString() }).eq("evento_chave", eventoChave);
    return Response.json({ ok: false }, { status: 500 });
  }
}