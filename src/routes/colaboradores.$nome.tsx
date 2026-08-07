import { createFileRoute } from "@tanstack/react-router";
import { DetalhePerfil } from "@/components/dashboard/DetalhePerfil";

export const Route = createFileRoute("/colaboradores/$nome")({
  head: () => ({
    meta: [
      { title: "Perfil do Colaborador | Gestão de Vagas" },
      { name: "description", content: "Desempenho detalhado do colaborador em vagas e presenças." },
      { property: "og:title", content: "Perfil do Colaborador | Gestão de Vagas" },
      {
        property: "og:description",
        content: "Desempenho detalhado do colaborador em vagas e presenças.",
      },
    ],
  }),
  component: Pagina,
});

function Pagina() {
  const { nome } = Route.useParams();
  return <DetalhePerfil tipo="colaborador" nome={decodeURIComponent(nome)} />;
}