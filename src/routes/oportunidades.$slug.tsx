import { createFileRoute } from "@tanstack/react-router";
import { ListaVagasPublicas } from "@/components/diarias/PaginaVagasPublicas";
import { vagasPublicasQuery } from "@/lib/oportunidades-query";

export const Route = createFileRoute("/oportunidades/$slug")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(vagasPublicasQuery(params.slug)),
  head: ({ loaderData }) => {
    const title = `Vagas disponíveis${loaderData ? ` — ${loaderData.empresa.nome}` : ""} | RECRUTA+`;
    const description = "Consulte diárias selecionadas, diárias avulsas e vagas CLT publicadas e cadastre-se na oportunidade desejada.";
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] };
  },
  errorComponent: () => <p role="alert" className="p-8">Não foi possível carregar as vagas. Tente novamente.</p>,
  notFoundComponent: () => <p className="p-8">Link de vagas indisponível.</p>,
  component: Pagina,
});
function Pagina() { const { slug } = Route.useParams(); return <ListaVagasPublicas slug={slug} />; }