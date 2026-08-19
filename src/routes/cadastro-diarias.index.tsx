import { createFileRoute } from "@tanstack/react-router";

import { PortalCaptacao } from "@/components/diarias/PortalCaptacao";
import { metaPortalCaptacao } from "@/lib/portal-meta";

/** Formato antigo do link (/cadastro-diarias?empresa=slug), mantido para não quebrar divulgações. */
export const Route = createFileRoute("/cadastro-diarias/")({
  validateSearch: (busca: Record<string, unknown>) => ({
    empresa: typeof busca["empresa"] === "string" ? (busca["empresa"] as string) : "",
  }),
  head: () => ({ meta: metaPortalCaptacao }),
  component: Pagina,
});

function Pagina() {
  const { empresa } = Route.useSearch();
  return <PortalCaptacao slug={empresa} />;
}
