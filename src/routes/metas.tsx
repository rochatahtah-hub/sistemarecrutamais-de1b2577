import { useEffect, useMemo, useState } from "react";
import { Sigiloso } from "@/lib/privacidade";
import { createFileRoute } from "@tanstack/react-router";

import { RequerAdmin } from "@/components/RequerAdmin";
import { Target } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePermissoes } from "@/lib/permissoes";
import { useConfiguracoes, useSalvarConfiguracao, useVagas } from "@/lib/dados";
import { fmtNum, fmtPct } from "@/lib/metricas";
import { quinzenaAtual } from "@/lib/quinzena";
import { useAtualizarPerfil, useProgramadoras } from "@/lib/programacao";

export const Route = createFileRoute("/metas")({
  head: () => ({
    meta: [
      { title: "Metas | Sistema de Vagas" },
      {
        name: "description",
        content: "Defina a meta de presenças da quinzena e as metas individuais das programadoras.",
      },
      { property: "og:title", content: "Metas | Sistema de Vagas" },
      {
        property: "og:description",
        content: "Defina a meta de presenças da quinzena e as metas individuais das programadoras.",
      },
    ],
  }),
  component: PaginaProtegida,
});

function Pagina() {
  const { pode } = usePermissoes();
  const podeEditar = pode("metas", "editar");
  const q = quinzenaAtual();
  const { data: config } = useConfiguracoes();
  const salvarConfig = useSalvarConfiguracao();
  const { data: registros = [] } = useVagas();
  const { data: perfis = [] } = useProgramadoras();
  const atualizar = useAtualizarPerfil();

  const metaSalva = config?.metaPresencas;
  const [meta, setMeta] = useState<number>(0);
  useEffect(() => {
    if (typeof metaSalva === "number") setMeta(metaSalva);
  }, [metaSalva]);

  const realizado = useMemo(
    () =>
      registros
        .filter((r) => r.status === "PRESENCA" && r.data >= q.inicio && r.data <= q.fim)
        .reduce((s, r) => s + (r.quantidade || 1), 0),
    [registros, q.inicio, q.fim],
  );

  const faltam = Math.max(meta - realizado, 0);
  const pctMeta = meta > 0 ? (realizado / meta) * 100 : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Metas</h1>
        <p className="text-sm text-muted-foreground">{q.rotulo}</p>
      </div>

      <div className="surface-panel space-y-4 rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Meta geral da quinzena</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="meta">Meta de presenças</Label>
            <Input
              id="meta"
              type="number"
              min={0}
              value={meta}
              disabled={!podeEditar}
              onChange={(e) => setMeta(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Realizado</Label>
            <p className="pt-2 font-display text-2xl font-bold">{fmtNum(realizado)}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Faltam</Label>
            <p className="pt-2 font-display text-2xl font-bold">{fmtNum(faltam)}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Percentual da meta</Label>
            <p className="pt-2 font-display text-2xl font-bold text-primary">{fmtPct(pctMeta)}</p>
          </div>
        </div>
        {meta > 0 && <Progress value={Math.min(pctMeta, 100)} />}
        {meta > 0 && realizado >= meta && (
          <p className="text-sm font-semibold text-primary">
            {realizado > meta ? "META SUPERADA" : "META ATINGIDA"}
          </p>
        )}
        {podeEditar && (
          <Button
            onClick={() =>
              salvarConfig.mutate(
                { chave: "meta_presencas", valor: meta },
                { onSuccess: () => toast.success("Meta salva.") },
              )
            }
            disabled={salvarConfig.isPending}
          >
            Salvar meta
          </Button>
        )}
      </div>

      <div className="surface-panel rounded-2xl p-4">
        <h2 className="mb-3 font-display text-lg font-semibold">Metas individuais</h2>
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Programadora</TableHead>
              <TableHead className="text-right">Meta da quinzena</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {perfis.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  <Sigiloso valor={p.nome} />
                </TableCell>
                <TableCell className="text-right">
                  {podeEditar ? (
                    <Input
                      type="number"
                      min={0}
                      className="ml-auto h-8 w-24 text-right"
                      defaultValue={p.meta_quinzena}
                      onBlur={(e) => {
                        const valor = Number(e.target.value) || 0;
                        if (valor === p.meta_quinzena) return;
                        atualizar.mutate(
                          { id: p.id, meta_quinzena: valor },
                          { onSuccess: () => toast.success("Meta individual atualizada.") },
                        );
                      }}
                    />
                  ) : (
                    fmtNum(p.meta_quinzena)
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}

function PaginaProtegida() {
  return (
    <RequerAdmin area="Metas">
      <Pagina />
    </RequerAdmin>
  );
}
