import { createFileRoute } from "@tanstack/react-router";
import { VagaPublica } from "@/components/diarias/PaginaVagasPublicas";
import { vagaPublicaQuery } from "@/lib/oportunidades-query";

export const Route = createFileRoute("/oportunidade/$slug/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(vagaPublicaQuery(params.slug, params.id)),
  head: ({ loaderData }) => {
    const title = `${loaderData?.oportunidade?.titulo ?? "Vaga indisponível"} | RECRUTA+`;
    const description = loaderData?.oportunidade?.descricao || "Confira os detalhes desta oportunidade e envie sua candidatura pelo RECRUTA+.";
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] };
  },
  errorComponent: () => <p role="alert" className="p-8">Não foi possível carregar esta vaga. Verifique o link e tente novamente.</p>,
  notFoundComponent: () => <p className="p-8">Esta vaga não está disponível.</p>,
  component: Pagina,
});
function Pagina() { const { slug, id } = Route.useParams(); return <VagaPublica slug={slug} id={id} />; }