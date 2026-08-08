import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileDown } from "lucide-react";

import { FiltrosBar } from "@/components/FiltrosBar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useVagas } from "@/lib/dados";
import { aplicarFiltros, useFiltros } from "@/lib/filtros";
import { exportarExcel } from "@/lib/exportar";
import { fmtData, fmtNum } from "@/lib/metricas";
import { STATUS_LABEL } from "@/lib/tipos";
import { PlanilhaAtivaBanner, SemPlanilha } from "@/components/PlanilhaAtiva";

export const Route = createFileRoute("/vagas")({
  head: () => ({
    meta: [
      { title: "Registros de Vagas | Gestão de Vagas" },
      { name: "description", content: "Consulte, filtre e exporte todos os registros de vagas." },
      { property: "og:title", content: "Registros de Vagas | Gestão de Vagas" },
      {
        property: "og:description",
        content: "Consulte, filtre e exporte todos os registros de vagas.",
      },
    ],
  }),
  component: Pagina,
});

function Pagina() {
  const { data: registros = [] } = useVagas();
  const { filtros } = useFiltros();
  const [pagina, setPagina] = useState(0);
  const porPagina = 50;

  const filtrados = useMemo(() => aplicarFiltros(registros, filtros), [registros, filtros]);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const atual = Math.min(pagina, totalPaginas - 1);
  const visiveis = filtrados.slice(atual * porPagina, atual * porPagina + porPagina);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Vagas</h1>
        <Button variant="outline" onClick={() => void exportarExcel(filtrados, "vagas")}>
          <FileDown className="mr-2 h-4 w-4" /> Exportar Excel
        </Button>
      </div>

      <FiltrosBar registros={registros} />

      <p className="text-sm text-muted-foreground">
        {fmtNum(filtrados.length)} registros encontrados.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40">
              <TableHead>Data</TableHead>
              <TableHead>Colaborador</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Vaga</TableHead>
              <TableHead className="text-right">Qtd.</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Observação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Nenhum registro para os filtros selecionados.
                </TableCell>
              </TableRow>
            )}
            {visiveis.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap">{fmtData(r.data)}</TableCell>
                <TableCell>{r.colaborador}</TableCell>
                <TableCell>{r.empresa}</TableCell>
                <TableCell>{r.descricao || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{r.quantidade}</TableCell>
                <TableCell>{STATUS_LABEL[r.status] ?? r.status}</TableCell>
                <TableCell className="max-w-[260px] truncate text-muted-foreground">
                  {r.observacao || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={atual === 0} onClick={() => setPagina(atual - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {atual + 1} de {totalPaginas}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={atual >= totalPaginas - 1}
            onClick={() => setPagina(atual + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}