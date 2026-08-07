import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { FiltrosBar } from "@/components/FiltrosBar";
import { TabelaDesempenho } from "@/components/dashboard/TabelaDesempenho";
import { useConfiguracoes, useVagas } from "@/lib/dados";
import { aplicarFiltros, useFiltros } from "@/lib/filtros";
import { agregarPor } from "@/lib/metricas";
import { METAS_PADRAO } from "@/lib/tipos";

export const Route = createFileRoute("/colaboradores/")({
  head: () => ({
    meta: [
      { title: "Desempenho dos Colaboradores | Gestão de Vagas" },
      {
        name: "description",
        content: "Ranking e indicadores de presença, falta e cancelamento por recrutador.",
      },
      { property: "og:title", content: "Desempenho dos Colaboradores | Gestão de Vagas" },
      {
        property: "og:description",
        content: "Ranking e indicadores de presença, falta e cancelamento por recrutador.",
      },
    ],
  }),
  component: Pagina,
});

function Pagina() {
  const { data: registros = [] } = useVagas();
  const { data: config } = useConfiguracoes();
  const { filtros } = useFiltros();
  const linhas = useMemo(
    () => agregarPor(aplicarFiltros(registros, filtros), "colaborador"),
    [registros, filtros],
  );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Desempenho dos colaboradores</h1>
      <FiltrosBar registros={registros} />
      <TabelaDesempenho
        linhas={linhas}
        destino="colaboradores"
        metaPresenca={(config?.metas ?? METAS_PADRAO).presenca}
      />
    </div>
  );
}