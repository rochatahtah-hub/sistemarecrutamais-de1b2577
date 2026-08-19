import { createServerFn } from "@tanstack/react-start";

/**
 * Resolve a empresa do portal público pelo slug do link, no servidor.
 * Evita expor qualquer função do banco à chave anônima.
 */
export const empresaPublicaPorSlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: String(d?.slug ?? "").trim().slice(0, 80) }))
  .handler(async ({ data }) => {
    if (!data.slug) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: empresa, error } = await supabaseAdmin
      .from("tenants")
      .select("id,nome,slug")
      .eq("slug", data.slug)
      .eq("ativo", true)
      .eq("status", "ativo")
      .maybeSingle();
    if (error) {
      // Registro interno: o candidato recebe apenas a mensagem de "tente novamente".
      console.error("[portal-diarias] falha ao resolver empresa", data.slug, error.message);
      throw new Error("Falha ao carregar os dados da empresa.");
    }
    return empresa ?? null;
  });
