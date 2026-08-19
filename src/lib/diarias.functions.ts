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
    const { data: empresa } = await supabaseAdmin
      .from("tenants")
      .select("id,nome,slug")
      .eq("slug", data.slug)
      .eq("ativo", true)
      .eq("status", "ativo")
      .maybeSingle();
    return empresa ?? null;
  });
