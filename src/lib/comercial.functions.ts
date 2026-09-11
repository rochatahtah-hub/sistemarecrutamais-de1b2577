import { createServerFn } from "@tanstack/react-start";
import { randomUUID } from "crypto";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type FormaPagamento = "pix" | "cartao";

function validarTexto(valor: string, minimo: number, maximo: number, campo: string) {
  const limpo = valor.trim();
  if (limpo.length < minimo || limpo.length > maximo) throw new Error(`Revise o campo ${campo}.`);
  return limpo;
}

async function garantirSuperAdmin(context: { supabase: { rpc: Function } }) {
  const { data } = await (context.supabase.rpc as (n: string) => Promise<{ data: boolean | null }>)(
    "eh_super_admin_atual",
  );
  if (!data) throw new Error("Acesso exclusivo do Admin Master.");
}

export const listarPlanosPublicos = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("planos")
    .select("id,chave,nome,descricao,preco_mensal_centavos,periodicidade,recursos,limites,ordem")
    .eq("ativo", true)
    .eq("publico", true)
    .gt("preco_mensal_centavos", 0)
    .order("ordem")
    .order("preco_mensal_centavos");
  if (error) throw new Error("Não foi possível carregar os planos.");
  return data ?? [];
});

export const iniciarContratacao = createServerFn({ method: "POST" })
  .inputValidator((d: {
    planoId: string;
    empresaNome: string;
    responsavelNome: string;
    email: string;
    telefone: string;
    cnpj: string;
    formaPagamento: FormaPagamento;
    origem: string;
  }) => d)
  .handler(async ({ data }) => {
    const { normalizarEmailComercial, somenteDigitos, mercadoPagoFetch } = await import("./comercial.server");
    const empresaNome = validarTexto(data.empresaNome, 2, 140, "empresa");
    const responsavelNome = validarTexto(data.responsavelNome, 2, 140, "responsável");
    const email = normalizarEmailComercial(data.email);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Informe um e-mail válido.");
    const telefone = somenteDigitos(data.telefone);
    if (telefone.length < 10 || telefone.length > 13) throw new Error("Informe um telefone válido.");
    const cnpj = somenteDigitos(data.cnpj);
    if (cnpj && cnpj.length !== 14) throw new Error("Revise o CNPJ informado.");
    if (data.formaPagamento !== "pix" && data.formaPagamento !== "cartao") {
      throw new Error("Escolha uma forma de pagamento válida.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: plano, error: erroPlano } = await supabaseAdmin
      .from("planos")
      .select("id,nome,preco_mensal_centavos,publico,ativo")
      .eq("id", data.planoId)
      .eq("publico", true)
      .eq("ativo", true)
      .maybeSingle();
    if (erroPlano || !plano || plano.preco_mensal_centavos <= 0) throw new Error("Plano indisponível.");

    const { data: lead, error: erroLead } = await supabaseAdmin
      .from("leads_comerciais")
      .insert({
        empresa_nome: empresaNome,
        responsavel_nome: responsavelNome,
        email,
        telefone,
        cnpj: cnpj || null,
        status: "checkout_iniciado",
        plano_interesse_id: plano.id,
        origem: data.origem === "pagina_publica" ? "pagina_publica" : "link_direto",
      })
      .select("id")
      .single();
    if (erroLead || !lead) {
      if (erroLead?.code === "23505") throw new Error("Já existe uma contratação ativa para este e-mail ou CNPJ.");
      throw new Error("Não foi possível iniciar a contratação.");
    }

    const referencia = `recruta-${randomUUID()}`;
    const { data: pedido, error: erroPedido } = await supabaseAdmin
      .from("pedidos_comerciais")
      .insert({
        lead_id: lead.id,
        plano_id: plano.id,
        referencia,
        valor_centavos: plano.preco_mensal_centavos,
        forma_pagamento: data.formaPagamento,
      })
      .select("id")
      .single();
    if (erroPedido || !pedido) throw new Error("Não foi possível criar o pedido.");

    const idempotencyKey = `pedido:${pedido.id}`;
    try {
      const preferencia = await mercadoPagoFetch<{ id: string; init_point: string }>("/checkout/preferences", {
        method: "POST",
        headers: { "X-Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          items: [{
            id: plano.id,
            title: `RECRUTA+ — ${plano.nome}`,
            description: "Mensalidade da plataforma RECRUTA+",
            quantity: 1,
            currency_id: "BRL",
            unit_price: plano.preco_mensal_centavos / 100,
          }],
          payer: { name: responsavelNome, email, phone: { number: telefone } },
          external_reference: referencia,
          payment_methods: {
            excluded_payment_types:
              data.formaPagamento === "pix" ? [{ id: "credit_card" }, { id: "debit_card" }] : [{ id: "bank_transfer" }],
          },
          notification_url: `${process.env["APP_PUBLIC_URL"] ?? "https://recrutamaisrh.ia.br"}/api/public/hooks/mercado-pago`,
          back_urls: {
            success: `${process.env["APP_PUBLIC_URL"] ?? "https://recrutamaisrh.ia.br"}/contratacao-status?pedido=${pedido.id}`,
            pending: `${process.env["APP_PUBLIC_URL"] ?? "https://recrutamaisrh.ia.br"}/contratacao-status?pedido=${pedido.id}`,
            failure: `${process.env["APP_PUBLIC_URL"] ?? "https://recrutamaisrh.ia.br"}/contratacao-status?pedido=${pedido.id}`,
          },
          auto_return: "approved",
        }),
      });
      await supabaseAdmin.from("pedidos_comerciais").update({
        status: "aguardando_pagamento",
        provedor_checkout_id: preferencia.id,
        checkout_url: preferencia.init_point,
      }).eq("id", pedido.id);
      await supabaseAdmin.from("leads_comerciais").update({ status: "pagamento_pendente" }).eq("id", lead.id);
      return { ok: true as const, checkoutUrl: preferencia.init_point, pedidoId: pedido.id };
    } catch (erro) {
      await supabaseAdmin.from("pedidos_comerciais").update({ status: "cancelado" }).eq("id", pedido.id);
      throw erro;
    }
  });

export const consultarStatusContratacao = createServerFn({ method: "POST" })
  .inputValidator((d: { pedidoId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pedido } = await supabaseAdmin
      .from("pedidos_comerciais")
      .select("status")
      .eq("id", data.pedidoId)
      .maybeSingle();
    return { status: pedido?.status ?? "nao_encontrado" };
  });

export const listarComercialMaster = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await garantirSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [leads, pedidos, pagamentos, assinaturas, planos] = await Promise.all([
      supabaseAdmin.from("leads_comerciais").select("id,empresa_nome,responsavel_nome,email,telefone,cnpj,status,created_at,plano_interesse_id").order("created_at", { ascending: false }).limit(200),
      supabaseAdmin.from("pedidos_comerciais").select("id,lead_id,plano_id,valor_centavos,forma_pagamento,status,created_at").order("created_at", { ascending: false }).limit(200),
      supabaseAdmin.from("pagamentos_comerciais").select("id,pedido_id,valor_centavos,forma_pagamento,status,pago_em,created_at").order("created_at", { ascending: false }).limit(200),
      supabaseAdmin.from("assinaturas_comerciais").select("id,tenant_id,plano_id,status,proxima_cobranca_em,created_at").order("created_at", { ascending: false }).limit(200),
      supabaseAdmin.from("planos").select("id,chave,nome,descricao,preco_mensal_centavos,periodicidade,recursos,limites,ativo,publico,ordem").order("ordem"),
    ]);
    const erro = leads.error ?? pedidos.error ?? pagamentos.error ?? assinaturas.error ?? planos.error;
    if (erro) throw new Error("Não foi possível carregar a gestão comercial.");
    return { leads: leads.data ?? [], pedidos: pedidos.data ?? [], pagamentos: pagamentos.data ?? [], assinaturas: assinaturas.data ?? [], planos: planos.data ?? [] };
  });

export const salvarPlanoComercial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; precoMensalCentavos: number; publico: boolean; ordem: number; recursos: string[] }) => d)
  .handler(async ({ data, context }) => {
    await garantirSuperAdmin(context);
    if (!Number.isInteger(data.precoMensalCentavos) || data.precoMensalCentavos < 0) throw new Error("Preço inválido.");
    const recursos = data.recursos.map((r) => r.trim()).filter(Boolean).slice(0, 20);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("planos").update({
      preco_mensal_centavos: data.precoMensalCentavos,
      publico: data.publico && data.precoMensalCentavos > 0,
      ordem: data.ordem,
      recursos,
    }).eq("id", data.id);
    if (error) throw new Error("Não foi possível salvar o plano.");
    return { ok: true };
  });