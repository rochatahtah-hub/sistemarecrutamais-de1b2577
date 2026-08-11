import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useVagas } from "@/lib/dados";
import { Sigiloso } from "@/lib/privacidade";
import { agregar, agregarPor, fmtNum, fmtPct, variacao } from "@/lib/metricas";
import type { VagaRegistro } from "@/lib/tipos";
import { PlanilhaAtivaBanner, SemPlanilha } from "@/components/PlanilhaAtiva";

export const Route = createFileRoute("/comparar")({
  head: () => ({
    meta: [
      { title: "Comparar Períodos | Gestão de Vagas" },
      {
        name: "description",
        content: "Compare dois períodos e identifique evolução ou queda nos indicadores.",
      },
      { property: "og:title", content: "Comparar Períodos | Gestão de Vagas" },
      {
        property: "og:description",
        content: "Compare dois períodos e identifique evolução ou queda nos indicadores.",
      },
    ],
  }),
  component: Pagina,
});

function noIntervalo(registros: VagaRegistro[], de: string, ate: string) {
  return registros.filter((r) => (!de || r.data >= de) && (!ate || r.data <= ate));
}

function Delta({ valor, invertido = false }: { valor: number; invertido?: boolean }) {
  const neutro = Math.abs(valor) < 0.05;
  const bom = invertido ? valor < 0 : valor > 0;
  const Icone = neutro ? ArrowRight : valor > 0 ? ArrowUpRight : ArrowDownRight;
  const cor = neutro ? "text-muted-foreground" : bom ? "text-success" : "text-destructive";

  return (
    <span className={`inline-flex items-center gap-1 font-medium tabular-nums ${cor}`}>
      <Icone className="h-4 w-4" />
      {valor > 0 ? "+" : ""}
      {valor.toFixed(1)}%
    </span>
  );
}

function Pagina() {
  const { data: registros = [], isLoading } = useVagas();
  const hoje = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);

  const [aDe, setADe] = useState(iso(inicioMesAnterior));
  const [aAte, setAAte] = useState(iso(fimMesAnterior));
  const [bDe, setBDe] = useState(iso(inicioMes));
  const [bAte, setBAte] = useState(iso(hoje));

  const periodoA = useMemo(() => noIntervalo(registros, aDe, aAte), [registros, aDe, aAte]);
  const periodoB = useMemo(() => noIntervalo(registros, bDe, bAte), [registros, bDe, bAte]);
  const tA = agregar(periodoA);
  const tB = agregar(periodoB);

  const indicadores = [
    { rotulo: "Vagas fechadas", a: tA.vagas, b: tB.vagas, invertido: false, pct: false },
    { rotulo: "Presenças", a: tA.presencas, b: tB.presencas, invertido: false, pct: false },
    { rotulo: "Faltas", a: tA.faltas, b: tB.faltas, invertido: true, pct: false },
    { rotulo: "Cancelamentos", a: tA.cancelamentos, b: tB.cancelamentos, invertido: true, pct: false },
    { rotulo: "% Presença", a: tA.pctPresenca, b: tB.pctPresenca, invertido: false, pct: true },
    { rotulo: "% Falta", a: tA.pctFalta, b: tB.pctFalta, invertido: true, pct: true },
    {
      rotulo: "% Cancelamento",
      a: tA.pctCancelamento,
      b: tB.pctCancelamento,
      invertido: true,
      pct: true,
    },
  ];

  const colaboradores = useMemo(() => {
    const mapaA = new Map(agregarPor(periodoA, "colaborador").map((l) => [l.nome, l]));
    const mapaB = new Map(agregarPor(periodoB, "colaborador").map((l) => [l.nome, l]));
    const nomes = Array.from(new Set([...mapaA.keys(), ...mapaB.keys()])).sort();
    return nomes.map((nome) => {
      const a = mapaA.get(nome);
      const b = mapaB.get(nome);
      return {
        nome,
        vagasA: a?.vagas ?? 0,
        vagasB: b?.vagas ?? 0,
        presA: a?.pctPresenca ?? 0,
        presB: b?.pctPresenca ?? 0,
      };
    });
  }, [periodoA, periodoB]);

  if (!isLoading && registros.length === 0) return <SemPlanilha pagina="A comparação de períodos" />;

  return (
    <div className="space-y-4">
      <PlanilhaAtivaBanner />
      <div>
        <h1 className="font-display text-2xl font-bold">Comparar períodos</h1>
        <p className="text-sm text-muted-foreground">
          Selecione dois intervalos para medir a evolução dos indicadores.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { titulo: "Período A", de: aDe, ate: aAte, setDe: setADe, setAte: setAAte },
          { titulo: "Período B", de: bDe, ate: bAte, setDe: setBDe, setAte: setBAte },
        ].map((p) => (
          <div key={p.titulo} className="surface-panel space-y-3 rounded-xl p-4">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-primary">
              {p.titulo}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-xs">De</Label>
                <Input type="date" value={p.de} onChange={(e) => p.setDe(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Até</Label>
                <Input type="date" value={p.ate} onChange={(e) => p.setAte(e.target.value)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="surface-panel overflow-x-auto rounded-xl p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Indicador</TableHead>
              <TableHead className="text-right">Período A</TableHead>
              <TableHead className="text-right">Período B</TableHead>
              <TableHead className="text-right">Variação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {indicadores.map((i) => (
              <TableRow key={i.rotulo}>
                <TableCell className="font-medium">{i.rotulo}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {i.pct ? fmtPct(i.a) : fmtNum(i.a)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {i.pct ? fmtPct(i.b) : fmtNum(i.b)}
                </TableCell>
                <TableCell className="text-right">
                  <Delta
                    valor={i.pct ? i.b - i.a : variacao(i.b, i.a)}
                    invertido={i.invertido}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="surface-panel overflow-x-auto rounded-xl p-4">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Evolução por colaborador
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead className="text-right">Vagas A</TableHead>
              <TableHead className="text-right">Vagas B</TableHead>
              <TableHead className="text-right">Variação vagas</TableHead>
              <TableHead className="text-right">% Presença A</TableHead>
              <TableHead className="text-right">% Presença B</TableHead>
              <TableHead className="text-right">Variação presença</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {colaboradores.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                  Sem dados nos períodos selecionados.
                </TableCell>
              </TableRow>
            )}
            {colaboradores.map((c) => (
              <TableRow key={c.nome}>
                <TableCell className="font-medium">
                  <Sigiloso valor={c.nome} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{fmtNum(c.vagasA)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNum(c.vagasB)}</TableCell>
                <TableCell className="text-right">
                  <Delta valor={variacao(c.vagasB, c.vagasA)} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{fmtPct(c.presA)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtPct(c.presB)}</TableCell>
                <TableCell className="text-right">
                  <Delta valor={c.presB - c.presA} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}