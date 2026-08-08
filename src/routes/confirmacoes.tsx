import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileDown } from "lucide-react";

import { FiltrosBar } from "@/components/FiltrosBar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { agregar, fmtData, fmtNum, fmtPct } from "@/lib/metricas";
import { STATUS_LABEL } from "@/lib/tipos";
import { PlanilhaAtivaBanner, SemPlanilha } from "@/components/PlanilhaAtiva";

export const Route = createFileRoute("/confirmacoes")({
  head: () => ({
    meta: [
      { title: "Confirmações | Gestão de Vagas" },
      {
        name: "description",
        content:
          "Presenças, faltas e cancelamentos lidos da área CONFIRMAÇÃO da planilha ativa.",
      },
      { property: "og:title", content: "Confirmações | Gestão de Vagas" },
      {
        property: "og:description",
        content:
          "Presenças, faltas e cancelamentos lidos da área CONFIRMAÇÃO da planilha ativa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pagina,
});

type Aba = "TODAS" | "PRESENCA" | "FALTA" | "CANCELAMENTO";

const ABAS: { valor: Aba; label: string }[] = [
  { valor: "TODAS", label: "Todas as confirmações" },
  { valor: "PRESENCA", label: "Presenças" },
  { valor: "FALTA", label: "Faltas" },
  { valor: "CANCELAMENTO", label: "Cancelamentos" },
];

function Pagina() {
  const { data: registros = [] } = useVagas();
  const { filtros } = useFiltros();
  const [aba, setAba] = useState<Aba>("TODAS");
  const [pagina, setPagina] = useState(0);
  const porPagina = 50;

  const filtrados = useMemo(() => aplicarFiltros(registros, filtros), [registros, filtros]);
  const total = useMemo(() => agregar(filtrados), [filtrados]);
  const lista = useMemo(
    () => (aba === "TODAS" ? filtrados : filtrados.filter((r) => r.status === aba)),
    [filtrados, aba],
  );

  const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina));
  const atual = Math.min(pagina, totalPaginas - 1);
  const visiveis = lista.slice(atual * porPagina, atual * porPagina + porPagina);

  const cards = [
    { label: "Vagas", valor: fmtNum(total.vagas), pct: "" },
    { label: "Presenças", valor: fmtNum(total.presencas), pct: fmtPct(total.pctPresenca) },
    { label: "Faltas", valor: fmtNum(total.faltas), pct: fmtPct(total.pctFalta) },
    {
      label: "Cancelamentos",
      valor: fmtNum(total.cancelamentos),
      pct: fmtPct(total.pctCancelamento),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Confirmações</h1>
          <p className="text-sm text-muted-foreground">
            Dados lidos da área CONFIRMAÇÃO da planilha ativa.
          </p>
        </div>
        <Button variant="outline" onClick={() => void exportarExcel(lista, "confirmacoes")}>
          <FileDown className="mr-2 h-4 w-4" /> Exportar Excel
        </Button>
      </div>

      <FiltrosBar registros={registros} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="surface-panel rounded-xl p-4">
            <p className="text-xs uppercase text-muted-foreground">{c.label}</p>
            <p className="font-display text-2xl font-bold">{c.valor}</p>
            {c.pct && <p className="text-xs text-muted-foreground">{c.pct}</p>}
          </div>
        ))}
      </div>

      <Tabs
        value={aba}
        onValueChange={(v) => {
          setAba(v as Aba);
          setPagina(0);
        }}
      >
        <TabsList>
          {ABAS.map((a) => (
            <TabsTrigger key={a.valor} value={a.valor}>
              {a.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <p className="text-sm text-muted-foreground">{fmtNum(lista.length)} registros.</p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40">
              <TableHead>Data</TableHead>
              <TableHead>Colaborador</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Vaga</TableHead>
              <TableHead className="text-right">Qtd.</TableHead>
              <TableHead>Confirmação</TableHead>
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