import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileDown, FileText } from "lucide-react";
import { toast } from "sonner";

import { FiltrosBar } from "@/components/FiltrosBar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRegistrarConfirmacao, useVagas } from "@/lib/dados";
import { aplicarFiltros, useFiltros } from "@/lib/filtros";
import { exportarExcel } from "@/lib/exportar";
import { agregar, fmtData, fmtNum, fmtPct } from "@/lib/metricas";
import { STATUS_LABEL, type VagaRegistro } from "@/lib/tipos";
import { FichaVaga } from "@/components/vagas/FichaVaga";
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

type Aba = "TODAS" | "AGUARDANDO" | "PRESENCA" | "FALTA" | "CANCELAMENTO";

const ABAS: { valor: Aba; label: string }[] = [
  { valor: "TODAS", label: "Todas as confirmações" },
  { valor: "AGUARDANDO", label: "Aguardando confirmação" },
  { valor: "PRESENCA", label: "Presenças" },
  { valor: "FALTA", label: "Faltas" },
  { valor: "CANCELAMENTO", label: "Cancelamentos" },
];

function Pagina() {
  const { data: registros = [], isLoading } = useVagas();
  const { filtros } = useFiltros();
  const [aba, setAba] = useState<Aba>("TODAS");
  const [pagina, setPagina] = useState(0);
  const [ficha, setFicha] = useState<VagaRegistro | null>(null);
  const registrar = useRegistrarConfirmacao();
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
    { label: "Aguardando", valor: fmtNum(total.pendentes), pct: "" },
    { label: "Presenças", valor: fmtNum(total.presencas), pct: fmtPct(total.pctPresenca) },
    { label: "Faltas", valor: fmtNum(total.faltas), pct: fmtPct(total.pctFalta) },
    {
      label: "Cancelamentos",
      valor: fmtNum(total.cancelamentos),
      pct: fmtPct(total.pctCancelamento),
    },
  ];

  async function confirmar(id: string, status: string) {
    try {
      await registrar.mutateAsync({ id, status });
      toast.success("Confirmação registrada — dashboard, gráficos e relatórios atualizados.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (!isLoading && registros.length === 0) return <SemPlanilha pagina="Presenças, faltas e cancelamentos" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Confirmações</h1>
          <p className="text-sm text-muted-foreground">
            Fonte real dos indicadores: cada confirmação registrada aqui atualiza automaticamente a
            vaga, a empresa, o colaborador, o dashboard, os gráficos e os relatórios.
          </p>
        </div>
        <Button variant="outline" onClick={() => void exportarExcel(lista, "confirmacoes")}>
          <FileDown className="mr-2 h-4 w-4" /> Exportar Excel
        </Button>
      </div>

      <FiltrosBar registros={registros} />
      <PlanilhaAtivaBanner />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
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
              <TableHead className="text-right">Ficha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Nenhum registro para os filtros selecionados.
                </TableCell>
              </TableRow>
            )}
            {visiveis.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap">{fmtData(r.data)}</TableCell>
                <TableCell>{r.colaborador}</TableCell>
                <TableCell>{r.empresa}</TableCell>
                <TableCell>{r.candidato || r.descricao || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{r.quantidade}</TableCell>
                <TableCell>
                  <Select
                    value={r.status}
                    onValueChange={(v) => void confirmar(r.id, v)}
                  >
                    <SelectTrigger className="w-[210px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["AGUARDANDO", "PRESENCA", "FALTA", "CANCELAMENTO"].map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="max-w-[260px] truncate text-muted-foreground">
                  {r.observacao || "—"}
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