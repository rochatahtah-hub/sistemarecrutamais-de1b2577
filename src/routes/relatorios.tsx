import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileDown, FileText } from "lucide-react";
import { toast } from "sonner";

import { FiltrosBar } from "@/components/FiltrosBar";
import { Button } from "@/components/ui/button";
import { useConfiguracoes, useVagas } from "@/lib/dados";
import { aplicarFiltros, descreverPeriodo, useFiltros } from "@/lib/filtros";
import { exportarExcel, exportarPdf } from "@/lib/exportar";
import { agregar, fmtNum, fmtPct } from "@/lib/metricas";
import { METAS_PADRAO } from "@/lib/tipos";
import { SemPlanilha } from "@/components/PlanilhaAtiva";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios | Gestão de Vagas" },
      {
        name: "description",
        content: "Gere relatórios executivos em PDF e planilhas consolidadas em Excel.",
      },
      { property: "og:title", content: "Relatórios | Gestão de Vagas" },
      {
        property: "og:description",
        content: "Gere relatórios executivos em PDF e planilhas consolidadas em Excel.",
      },
    ],
  }),
  component: Pagina,
});

function Pagina() {
  const { data: registros = [], isLoading } = useVagas();
  const { data: config } = useConfiguracoes();
  const { filtros, filtrar } = useFiltros();
  const [gerando, setGerando] = useState(false);

  const filtrados = useMemo(() => filtrar(registros), [registros, filtros, filtrar]);
  const total = agregar(filtrados);
  const periodo = descreverPeriodo(filtrados);

  async function gerar(tipo: "pdf" | "excel") {
    if (filtrados.length === 0) {
      toast.error("Não há registros no período selecionado.");
      return;
    }
    setGerando(true);
    try {
      if (tipo === "pdf") {
        await exportarPdf(filtrados, periodo, config?.metas ?? METAS_PADRAO);
      } else {
        await exportarExcel(filtrados);
      }
      toast.success("Relatório gerado com sucesso.");
    } catch (e) {
      toast.error(`Falha ao gerar relatório: ${(e as Error).message}`);
    } finally {
      setGerando(false);
    }
  }

  if (!isLoading && registros.length === 0) return <SemPlanilha pagina="Relatórios" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Os relatórios respeitam exatamente os filtros aplicados abaixo.
        </p>
      </div>

      <FiltrosBar registros={registros} />

      <div className="surface-panel rounded-2xl p-5">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Prévia do conteúdo</h2>
        <p className="mt-1 font-display text-lg font-semibold">{periodo}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          {[
            { rotulo: "Vagas fechadas", valor: fmtNum(total.vagas) },
            { rotulo: "Presenças", valor: `${fmtNum(total.presencas)} (${fmtPct(total.pctPresenca)})` },
            { rotulo: "Faltas", valor: `${fmtNum(total.faltas)} (${fmtPct(total.pctFalta)})` },
            {
              rotulo: "Cancelamentos",
              valor: `${fmtNum(total.cancelamentos)} (${fmtPct(total.pctCancelamento)})`,
            },
          ].map((i) => (
            <div key={i.rotulo}>
              <p className="text-xs text-muted-foreground">{i.rotulo}</p>
              <p className="font-display text-xl font-bold">{i.valor}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button disabled={gerando} onClick={() => void gerar("pdf")}>
            <FileText className="mr-2 h-4 w-4" /> Gerar relatório PDF
          </Button>
          <Button variant="outline" disabled={gerando} onClick={() => void gerar("excel")}>
            <FileDown className="mr-2 h-4 w-4" /> Exportar Excel consolidado
          </Button>
        </div>
      </div>

      <div className="surface-panel rounded-2xl p-5 text-sm text-muted-foreground">
        <h2 className="mb-2 font-semibold text-foreground">O relatório em PDF inclui:</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>Capa com período analisado e data de emissão</li>
          <li>Resumo executivo com quantidades e percentuais</li>
          <li>Ranking de colaboradores e de empresas</li>
          <li>Alertas gerenciais gerados a partir das metas configuradas</li>
        </ul>
        <h2 className="mt-3 font-semibold text-foreground">O Excel consolidado inclui:</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>Aba de registros detalhados</li>
          <li>Aba de resumo geral</li>
          <li>Abas de desempenho por colaborador e por empresa</li>
        </ul>
      </div>
    </div>
  );
}