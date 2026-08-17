import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { FiltrosBar } from "@/components/FiltrosBar";
import { TabelaDesempenho } from "@/components/dashboard/TabelaDesempenho";
import { useConfiguracoes, useVagas } from "@/lib/dados";
import { aplicarFiltros, useFiltros } from "@/lib/filtros";
import { agregarPor } from "@/lib/metricas";
import { METAS_PADRAO } from "@/lib/tipos";
import { SemPlanilha } from "@/components/PlanilhaAtiva";
import { GerenciarEmpresas } from "@/components/programacao/GerenciarEmpresas";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/empresas/")({
  head: () => ({
    meta: [
      { title: "Desempenho das Empresas | Gestão de Vagas" },
      {
        name: "description",
        content: "Compare empresas por volume de vagas, presenças, faltas e cancelamentos.",
      },
      { property: "og:title", content: "Desempenho das Empresas | Gestão de Vagas" },
      {
        property: "og:description",
        content: "Compare empresas por volume de vagas, presenças, faltas e cancelamentos.",
      },
    ],
  }),
  component: Pagina,
});

function Pagina() {
  const { data: registros = [], isLoading } = useVagas();
  const { data: config } = useConfiguracoes();
  const { filtros } = useFiltros();
  const { isAdmin } = useAuth();
  const linhas = useMemo(
    () => agregarPor(filtrar(registros), "empresa"),
    [registros, filtros],
  );

  if (!isLoading && registros.length === 0)
    return (
      <div className="space-y-6">
        <SemPlanilha pagina="Empresas" />
        {isAdmin && <GerenciarEmpresas />}
      </div>
    );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Desempenho das empresas</h1>
      <FiltrosBar registros={registros} />
      <TabelaDesempenho
        linhas={linhas}
        destino="empresas"
        metaPresenca={(config?.metas ?? METAS_PADRAO).presenca}
      />
      {isAdmin && <GerenciarEmpresas />}
    </div>
  );
}