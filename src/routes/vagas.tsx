import { useMemo, useState } from "react";
import { Sigiloso, usePrivacidade } from "@/lib/privacidade";
import { createFileRoute } from "@tanstack/react-router";
import { FileDown, FileText } from "lucide-react";

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
import { SITUACAO_LABEL, STATUS_LABEL, type VagaRegistro } from "@/lib/tipos";
import { FichaVaga } from "@/components/vagas/FichaVaga";
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
  const priv = usePrivacidade();
  const { data: registros = [], isLoading } = useVagas();
  const { filtros } = useFiltros();
  const [pagina, setPagina] = useState(0);
  const [ficha, setFicha] = useState<VagaRegistro | null>(null);
  const porPagina = 50;

  const filtrados = useMemo(() => aplicarFiltros(registros, filtros), [registros, filtros]);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const atual = Math.min(pagina, totalPaginas - 1);
  const visiveis = filtrados.slice(atual * porPagina, atual * porPagina + porPagina);

  if (!isLoading && registros.length === 0) return <SemPlanilha pagina="Vagas" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
        <h1 className="font-display text-2xl font-bold">Vagas</h1>
        <Button variant="outline" onClick={() => void exportarExcel(filtrados, "vagas")}>
          <FileDown className="mr-2 h-4 w-4" /> Exportar Excel
        </Button>
      </div>

      <FiltrosBar registros={registros} />
      <PlanilhaAtivaBanner />

      <p className="text-sm text-muted-foreground">
        {fmtNum(filtrados.length)} registros encontrados.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Colaborador</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Vaga</TableHead>
              <TableHead className="text-right">Qtd.</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Observação</TableHead>
              <TableHead className="text-right">Ficha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  Nenhum registro para os filtros selecionados.
                </TableCell>
              </TableRow>
            )}
            {visiveis.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap">{fmtData(r.data)}</TableCell>
                <TableCell>
                  <Sigiloso valor={r.colaborador} />
                </TableCell>
                <TableCell>
                  <Sigiloso valor={r.empresa} tipo="empresa" />
                </TableCell>
                <TableCell>{priv.privado ? priv.texto(r.cargo || r.descricao) : (r.cargo || r.descricao || "—")}</TableCell>
                <TableCell className="text-right tabular-nums">{r.quantidade}</TableCell>
                <TableCell>{SITUACAO_LABEL[r.situacao] ?? r.situacao}</TableCell>
                <TableCell>{STATUS_LABEL[r.status] ?? r.status}</TableCell>
                <TableCell className="max-w-[260px] truncate text-muted-foreground">
                  {priv.privado ? priv.texto(r.observacao) : (r.observacao || "—")}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setFicha(r)}>
                    <FileText className="mr-1 h-4 w-4" /> Abrir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <FichaVaga
        vaga={ficha}
        registros={registros}
        aberto={ficha !== null}
        onFechar={() => setFicha(null)}
      />

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