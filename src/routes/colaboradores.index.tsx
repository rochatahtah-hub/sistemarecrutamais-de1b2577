import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { FiltrosBar } from "@/components/FiltrosBar";
import { TabelaDesempenho } from "@/components/dashboard/TabelaDesempenho";
import { useConfiguracoes, useVagas } from "@/lib/dados";
import { useFiltros } from "@/lib/filtros";
import { agregarPorProgramadora } from "@/lib/metricas";
import { useProgramadorasHabilitadas } from "@/lib/programacao";
import { METAS_PADRAO } from "@/lib/tipos";
import { SemPlanilha } from "@/components/PlanilhaAtiva";
import { PainelFuncoes } from "@/components/admin/PainelFuncoes";
import { usePermissoes } from "@/lib/permissoes";

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
  const { data: registros = [], isLoading } = useVagas();
  const { data: config } = useConfiguracoes();
  const { filtros, filtrar } = useFiltros();
  const { data: habilitadas = [] } = useProgramadorasHabilitadas();
  const { pode } = usePermissoes();
  const podeGerenciarFuncoes = pode("equipe", "editar");
  const linhas = useMemo(
    () => agregarPorProgramadora(filtrar(registros), habilitadas),
    [registros, filtros, filtrar, habilitadas],
  );

  if (!isLoading && registros.length === 0)
    return (
      <div className="space-y-6">
        <SemPlanilha pagina="Colaboradores" />
        {podeGerenciarFuncoes && <PainelFuncoes />}
      </div>
    );

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Desempenho dos colaboradores</h1>
      <FiltrosBar registros={registros} />
      <TabelaDesempenho
        linhas={linhas}
        destino="colaboradores"
        metaPresenca={(config?.metas ?? METAS_PADRAO).presenca}
      />
      {podeGerenciarFuncoes && <PainelFuncoes />}
    </div>
  );
}