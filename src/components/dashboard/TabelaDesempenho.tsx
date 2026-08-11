import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtNum, fmtPct, type LinhaAgregada } from "@/lib/metricas";
import { cn } from "@/lib/utils";

type Coluna = keyof LinhaAgregada;

const COLUNAS: { chave: Coluna; label: string; tipo: "texto" | "num" | "pct" }[] = [
  { chave: "nome", label: "Nome", tipo: "texto" },
  { chave: "vagas", label: "Vagas", tipo: "num" },
  { chave: "presencas", label: "Presenças", tipo: "num" },
  { chave: "faltas", label: "Faltas", tipo: "num" },
  { chave: "cancelamentos", label: "Cancel.", tipo: "num" },
  { chave: "pctPresenca", label: "% Presença", tipo: "pct" },
  { chave: "pctFalta", label: "% Falta", tipo: "pct" },
  { chave: "pctCancelamento", label: "% Cancel.", tipo: "pct" },
];

export function TabelaDesempenho({
  linhas,
  destino,
  metaPresenca,
}: {
  linhas: LinhaAgregada[];
  destino: "colaboradores" | "empresas";
  metaPresenca: number;
}) {
  const [ordem, setOrdem] = useState<{ coluna: Coluna; asc: boolean }>({
    coluna: "vagas",
    asc: false,
  });

  const ordenadas = useMemo(() => {
    const copia = [...linhas];
    copia.sort((a, b) => {
      const va = a[ordem.coluna];
      const vb = b[ordem.coluna];
      if (typeof va === "string" || typeof vb === "string") {
        return ordem.asc
          ? String(va).localeCompare(String(vb))
          : String(vb).localeCompare(String(va));
      }
      return ordem.asc ? Number(va) - Number(vb) : Number(vb) - Number(va);
    });
    return copia;
  }, [linhas, ordem]);

  const alternar = (coluna: Coluna) =>
    setOrdem((o) => (o.coluna === coluna ? { coluna, asc: !o.asc } : { coluna, asc: false }));

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/40">
            {COLUNAS.map((c) => (
              <TableHead
                key={c.chave}
                onClick={() => alternar(c.chave)}
                className={cn(
                  "cursor-pointer select-none whitespace-nowrap text-xs",
                  c.tipo !== "texto" && "text-right",
                )}
              >
                <span className="inline-flex items-center gap-1">
                  {c.label}
                  <ArrowUpDown className="h-3 w-3 opacity-50" />
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordenadas.length === 0 && (
            <TableRow>
              <TableCell colSpan={COLUNAS.length} className="py-8 text-center text-muted-foreground">
                Nenhum dado para os filtros selecionados.
              </TableCell>
            </TableRow>
          )}
          {ordenadas.map((l) => (
            <TableRow key={l.chave} className="hover:bg-secondary/30">
              <TableCell className="font-medium">
                <Link
                  to={destino === "colaboradores" ? "/colaboradores/$nome" : "/empresas/$nome"}
                  params={{ nome: encodeURIComponent(l.nome) }}
                  className="text-primary hover:underline"
                >
                  {destino === "colaboradores" ? mascarar(l.nome) : l.nome}
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
              <TableCell
                className={cn(
                  "text-right tabular-nums font-semibold",
                  l.pctPresenca < metaPresenca ? "text-destructive" : "text-success",
                )}
              >
                {fmtPct(l.pctPresenca)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{fmtPct(l.pctFalta)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {fmtPct(l.pctCancelamento)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}