import { createFileRoute } from "@tanstack/react-router";

import { PortalCaptacao } from "@/components/diarias/PortalCaptacao";
import { metaPortalCaptacao } from "@/lib/portal-meta";

/** Link público amigável por empresa: /cadastro-diarias/nome-da-empresa */
export const Route = createFileRoute("/cadastro-diarias/$slug")({
  head: () => ({ meta: metaPortalCaptacao }),
  component: Pagina,
});

function Pagina() {
  const { slug } = Route.useParams();
  return <PortalCaptacao slug={slug} />;
}
