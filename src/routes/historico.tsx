import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Archive, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FichaVaga } from "@/components/vagas/FichaVaga";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { useExcluirFicha, useVagas } from "@/lib/dados";
import { usePermissoes } from "@/lib/permissoes";
import { usePrivacidade } from "@/lib/privacidade";
import { fmtData, fmtNum, fmtPct } from "@/lib/metricas";
import { STATUS_LABEL, type VagaRegistro } from "@/lib/tipos";
import { quinzenaDe, quinzenaAtual } from "@/lib/quinzena";
import { useFecharQuinzena, useHistoricoQuinzenas } from "@/lib/programacao";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de Quinzenas | Sistema de Vagas" },
      {
        name: "description",
        content: "Consulte os resultados arquivados de cada quinzena encerrada.",
      },
      { property: "og:title", content: "Histórico de Quinzenas | Sistema de Vagas" },
      {
        property: "og:description",
        content: "Consulte os resultados arquivados de cada quinzena encerrada.",
      },
    ],
  }),
  component: Pagina,
});

function Pagina() {
  const { isAdmin } = useAuth();
  const { data: registros = [] } = useVagas();
  const { data: arquivadas = [] } = useHistoricoQuinzenas();
  const fechar = useFecharQuinzena();
  const atual = quinzenaAtual();

  const linhas = useMemo(() => {
    const mapa = new Map<
      string,
      { rotulo: string; inicio: string; fim: string; total: number; p: number; f: number; c: number }
    >();
    for (const r of registros) {
      const q = quinzenaDe(r.data);
      const item =
        mapa.get(q.chave) ??
        { rotulo: `${q.rotulo}/${q.ano}`, inicio: q.inicio, fim: q.fim, total: 0, p: 0, f: 0, c: 0 };
      const qtd = r.quantidade || 1;
      item.total += qtd;
      if (r.status === "PRESENCA") item.p += qtd;
      else if (r.status === "FALTA") item.f += qtd;
      else if (r.status === "CANCELAMENTO") item.c += qtd;
      mapa.set(q.chave, item);
    }
    return Array.from(mapa.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([chave, v]) => ({ chave, ...v }));
  }, [registros]);

  const arquivadasSet = new Set(arquivadas.map((a) => a.chave));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Histórico</h1>
        <p className="text-sm text-muted-foreground">
          Todas as quinzenas continuam disponíveis para relatórios, comparações e gráficos. O
          fechamento apenas arquiva o resultado — nenhum dado é apagado.
        </p>
      </div>

      <div className="surface-panel overflow-x-auto rounded-2xl p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quinzena</TableHead>
              <TableHead>Período</TableHead>
              <TableHead className="text-right">Vagas</TableHead>
              <TableHead className="text-right">Presenças</TableHead>
              <TableHead className="text-right">Faltas</TableHead>
              <TableHead className="text-right">Cancel.</TableHead>
              <TableHead className="text-right">% Presença</TableHead>
              <TableHead>Situação</TableHead>
              {isAdmin && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((l) => (
              <TableRow key={l.chave}>
                <TableCell className="font-medium">{l.rotulo}</TableCell>
                <TableCell>
                  {fmtData(l.inicio)} a {fmtData(l.fim)}
                </TableCell>
                <TableCell className="text-right">{fmtNum(l.total)}</TableCell>
                <TableCell className="text-right">{fmtNum(l.p)}</TableCell>
                <TableCell className="text-right">{fmtNum(l.f)}</TableCell>
                <TableCell className="text-right">{fmtNum(l.c)}</TableCell>
                <TableCell className="text-right">
                  {fmtPct(l.total ? (l.p / l.total) * 100 : 0)}
                </TableCell>
                <TableCell>
                  {l.chave === atual.chave
                    ? "Em andamento"
                    : arquivadasSet.has(l.chave)
                      ? "Arquivada"
                      : "Encerrada"}
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    {l.chave !== atual.chave && !arquivadasSet.has(l.chave) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          fechar.mutate(
                            {
                              chave: l.chave,
                              inicio: l.inicio,
                              fim: l.fim,
                              dados: {
                                vagas: l.total,
                                presencas: l.p,
                                faltas: l.f,
                                cancelamentos: l.c,
                              },
                            },
                            { onSuccess: () => toast.success("Quinzena arquivada.") },
                          )
                        }
                      >
                        <Archive className="mr-2 h-4 w-4" /> Arquivar
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
            {linhas.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  Nenhum registro ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
