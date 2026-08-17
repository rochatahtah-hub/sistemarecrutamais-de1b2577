import { useMemo } from "react";
import { Sigiloso } from "@/lib/privacidade";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";

import { FiltrosBar } from "@/components/FiltrosBar";
import { AtalhosPeriodo } from "@/components/AtalhosPeriodo";
import { SemPlanilha } from "@/components/PlanilhaAtiva";
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
import { rankingPerformance } from "@/lib/inteligencia";
import { fmtNum, fmtPct } from "@/lib/metricas";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Performance da Equipe | RECRUTA+" },
      {
        name: "description",
        content:
          "Ranking de performance dos colaboradores com índice equilibrado de qualidade, conversão e volume.",
      },
      { property: "og:title", content: "Performance da Equipe | RECRUTA+" },
      {
        property: "og:description",
        content: "Pódio e indicadores de presença, faltas, cancelamentos e conversão por colaborador.",
      },
    ],
  }),
  component: Pagina,
});

const MEDALHAS = ["🥇", "🥈", "🥉"];

function Pagina() {
  const { data: registros = [], isLoading } = useVagas();
  const { filtros, filtrar } = useFiltros();
  const linhas = useMemo(
    () => rankingPerformance(filtrar(registros)),
    [registros, filtros, filtrar],
  );

  if (!isLoading && registros.length === 0) return <SemPlanilha pagina="Performance" />;

  const podio = linhas.slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          <Trophy className="h-6 w-6 text-primary" /> Performance da equipe
        </h1>
        <p className="text-sm text-muted-foreground">
          Índice equilibrado: qualidade (presença), conversão de confirmações e volume — com
          penalização por faltas.
        </p>
      </div>

      <AtalhosPeriodo />
      <FiltrosBar registros={registros} />

      <div className="grid gap-3 md:grid-cols-3">
        {podio.map((l, i) => (
          <div key={l.chave} className="surface-panel rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl">{MEDALHAS[i]}</span>
              <span className="font-display text-2xl font-bold text-primary">
                {l.indice.toFixed(1).replace(".", ",")}
              </span>
            </div>
            <p className="mt-2 truncate font-semibold">
              <Sigiloso valor={l.nome} />
            </p>
            <p className="text-xs text-muted-foreground">
              {fmtNum(l.vagas)} vagas · {fmtPct(l.pctPresenca)} presença ·{" "}
              {fmtPct(l.taxaConfirmacao)} conversão
            </p>
          </div>
        ))}
        {podio.length === 0 && (
          <p className="text-sm text-muted-foreground">Sem dados no período selecionado.</p>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Colaborador</TableHead>
              <TableHead className="text-right">Vagas fechadas</TableHead>
              <TableHead className="text-right">Presenças</TableHead>
              <TableHead className="text-right">Faltas</TableHead>
              <TableHead className="text-right">Cancelamentos</TableHead>
              <TableHead className="text-right">% Presença</TableHead>
              <TableHead className="text-right">Conversão</TableHead>
              <TableHead className="text-right">Índice</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  Nenhum dado para os filtros selecionados.
                </TableCell>
              </TableRow>
            )}
            {linhas.map((l, i) => (
              <TableRow key={l.chave}>
                <TableCell className="tabular-nums text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-medium">
                  <Link
                    to="/colaboradores/$nome"
                    params={{ nome: encodeURIComponent(l.nome) }}
                    className="text-primary hover:underline"
                  >
                    <Sigiloso valor={l.nome} />
                  </Link>
                </TableCell>
                <TableCell className="text-right tabular-nums">{fmtNum(l.vagas)}</TableCell>
                <TableCell className="text-right tabular-nums text-success">
                  {fmtNum(l.presencas)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-destructive">
                  {fmtNum(l.faltas)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-warning">
                  {fmtNum(l.cancelamentos)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{fmtPct(l.pctPresenca)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtPct(l.taxaConfirmacao)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums text-primary">
                  {l.indice.toFixed(1).replace(".", ",")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}