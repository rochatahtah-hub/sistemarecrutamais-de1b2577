import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Inscrição do colaborador para ser avisado de novas vagas.
 *
 * O portal é público e anônimo. A empresa NUNCA vem do navegador: ela é
 * resolvida no servidor a partir do slug do link, do mesmo jeito que o resto do
 * portal faz. Assim ninguém consegue se inscrever — nem inscrever outra pessoa —
 * na lista de uma empresa que não seja a do link que abriu.
 */

function texto(valor: unknown, max: number) {
  return String(valor ?? "")
    .trim()
    .slice(0, max);
}

/** Só aceita endpoints http(s) de verdade — nada de javascript:, data:, etc. */
function endpointValido(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

async function empresaDoSlug(slug: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .eq("ativo", true)
    .eq("status", "ativo")
    .maybeSingle();
  return data?.id ?? null;
}

/** Chave pública do VAPID — pública por definição, é ela que o navegador usa. */
export const chavePublicaPush = createServerFn({ method: "GET" }).handler(async () => {
  return { chave: process.env["VAPID_PUBLIC_KEY"] ?? null };
});

export const inscreverAvisoVagas = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; endpoint: string }) => ({
    slug: texto(d?.slug, 80).toLowerCase(),
    endpoint: texto(d?.endpoint, 1000),
  }))
  .handler(async ({ data }) => {
    if (!data.slug || !endpointValido(data.endpoint)) {
      throw new Error("Não foi possível ativar os avisos. Recarregue a página e tente de novo.");
    }
    const tenantId = await empresaDoSlug(data.slug);
    if (!tenantId) throw new Error("Este link de cadastro não está disponível.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("push_inscricoes").upsert(
      {
        tenant_id: tenantId,
        endpoint: data.endpoint,
        status: "ativa",
        cancelada_em: null,
      },
      { onConflict: "endpoint" },
    );
    if (error) {
      console.error("[push] falha ao gravar inscrição:", error.message);
      throw new Error("Não foi possível ativar os avisos agora. Tente de novo em instantes.");
    }
    return { ok: true };
  });

export const cancelarAvisoVagas = createServerFn({ method: "POST" })
  .inputValidator((d: { endpoint: string }) => ({ endpoint: texto(d?.endpoint, 1000) }))
  .handler(async ({ data }) => {
    if (!endpointValido(data.endpoint)) return { ok: true };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Cancelar é sempre permitido: quem tem o endpoint é o próprio dispositivo.
    await supabaseAdmin
      .from("push_inscricoes")
      .update({ status: "cancelada", cancelada_em: new Date().toISOString() })
      .eq("endpoint", data.endpoint);
    return { ok: true };
  });

/**
 * Dispara o aviso de nova vaga para quem se inscreveu no portal daquela empresa.
 *
 * Chamado logo depois de publicar uma oportunidade. Três garantias:
 *   * a oportunidade é relida com a sessão de quem chamou, então a RLS já
 *     limita ao próprio tenant — um id de outra empresa não passa;
 *   * só dispara se o status for "ativa" (rascunho, arquivada ou cancelada não
 *     avisam ninguém);
 *   * falhar aqui nunca derruba a publicação: quem chama ignora o erro.
 */
export const avisarNovaVaga = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { oportunidadeId: string }) => ({
    oportunidadeId: texto(d?.oportunidadeId, 40),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: autorizado } = await supabase.rpc("tem_permissao", {
      _user_id: userId,
      _modulo: "captacao",
      _acao: "criar",
    });
    if (!autorizado) throw new Error("Sem permissão para publicar oportunidades.");

    // Leitura com a sessão do usuário: a RLS resolve o isolamento por empresa.
    const { data: oportunidade } = await supabase
      .from("captacao_oportunidades")
      .select("id,status,tenant_id")
      .eq("id", data.oportunidadeId)
      .maybeSingle();
    if (!oportunidade) return { enviados: 0, motivo: "não encontrada" };
    if (oportunidade.status !== "ativa") return { enviados: 0, motivo: "não publicada" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inscricoes } = await supabaseAdmin
      .from("push_inscricoes")
      .select("endpoint")
      .eq("tenant_id", oportunidade.tenant_id)
      .eq("status", "ativa")
      .limit(5000);

    const endpoints = (inscricoes ?? []).map((i) => i.endpoint);
    if (endpoints.length === 0) return { enviados: 0, motivo: "sem inscritos" };

    const { enviarAvisoPush } = await import("./push.server");
    const resultado = await enviarAvisoPush(endpoints);

    // Endereço que o serviço de push recusou em definitivo não é tentado de novo.
    if (resultado.invalidos.length > 0) {
      await supabaseAdmin
        .from("push_inscricoes")
        .update({ status: "invalida" })
        .in("endpoint", resultado.invalidos);
    }

    return { enviados: resultado.enviados, motivo: "ok" };
  });
