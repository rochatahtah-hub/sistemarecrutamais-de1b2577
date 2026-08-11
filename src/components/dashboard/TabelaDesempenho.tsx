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
import { usePrivacidade } from "@/lib/privacidade";
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
  const priv = usePrivacidade();

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
          <TableRow>
            {COLUNAS.map((c) => (
              <TableHead
                key={c.chave}
                onClick={() => alternar(c.chave)}
                className={cn(
                  "cursor-pointer select-none whitespace-nowrap transition-colors hover:text-foreground",
                  c.tipo !== "texto" && "text-right",
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  {c.label}
                  <ArrowUpDown
                    className={cn(
                      "h-3 w-3 transition-opacity",
                      ordem.coluna === c.chave ? "text-gold opacity-100" : "opacity-40",
                    )}
                  />
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
            <TableRow key={l.chave}>
              <TableCell className="font-medium">
                <Link
                  to={destino === "colaboradores" ? "/colaboradores/$nome" : "/empresas/$nome"}
                  params={{ nome: encodeURIComponent(l.nome) }}
                  className="font-medium text-foreground underline-offset-4 transition-colors hover:text-gold hover:underline"
                >
                  {destino === "colaboradores" ? priv.nome(l.nome) : priv.empresa(l.nome)}
                </Link>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {priv.privado ? priv.numero(l.vagas) : fmtNum(l.vagas)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-success">
                {priv.privado ? priv.numero(l.presencas) : fmtNum(l.presencas)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-destructive">
                {priv.privado ? priv.numero(l.faltas) : fmtNum(l.faltas)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-warning">
                {priv.privado ? priv.numero(l.cancelamentos) : fmtNum(l.cancelamentos)}
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