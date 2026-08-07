import { createFileRoute } from "@tanstack/react-router";
import { DetalhePerfil } from "@/components/dashboard/DetalhePerfil";

export const Route = createFileRoute("/empresas/$nome")({
  head: () => ({
    meta: [
      { title: "Perfil da Empresa | Gestão de Vagas" },
      { name: "description", content: "Indicadores detalhados de vagas e presenças da empresa." },
      { property: "og:title", content: "Perfil da Empresa | Gestão de Vagas" },
      {
        property: "og:description",
        content: "Indicadores detalhados de vagas e presenças da empresa.",
      },
    ],
  }),
  component: Pagina,
});

function Pagina() {
  const { nome } = Route.useParams();
  return <DetalhePerfil tipo="empresa" nome={decodeURIComponent(nome)} />;
}