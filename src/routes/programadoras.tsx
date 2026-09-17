import { useMemo } from "react";
import { Sigiloso } from "@/lib/privacidade";
import { createFileRoute } from "@tanstack/react-router";

import { RequerAdmin } from "@/components/RequerAdmin";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useVagas } from "@/lib/dados";
import { usePermissoes } from "@/lib/permissoes";
import { GerenciarUsuarios } from "@/components/programacao/GerenciarUsuarios";
import { fmtNum, fmtPct } from "@/lib/metricas";
import { quinzenaAtual } from "@/lib/quinzena";
import { useAtualizarPerfil, useProgramadoras } from "@/lib/programacao";

export const Route = createFileRoute("/programadoras")({
  head: () => ({
    meta: [
      { title: "Programadoras | Sistema de Vagas" },
      {
        name: "description",
        content: "Ranking de desempenho, metas e atividade de cada programadora.",
      },
      { property: "og:title", content: "Programadoras | Sistema de Vagas" },
      {
        property: "og:description",
        content: "Ranking de desempenho, metas e atividade de cada programadora.",
      },
    ],
  }),
  component: PaginaProtegida,
});

function quando(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function Pagina() {
  const { pode } = usePermissoes();
  const podeGerirEquipe = pode("equipe", "criar") || pode("equipe", "editar");
  const podeEditar = pode("programadoras", "editar");
  const { data: perfis = [] } = useProgramadoras();
  const { data: registros = [] } = useVagas();
  const atualizar = useAtualizarPerfil();
  const q = quinzenaAtual();

  const linhas = useMemo(() => {
    return perfis
      .filter((p) => p.ativo)
      .map((p) => {
        const meus = registros.filter(
          (r) => r.colaborador === p.nome && r.data >= q.inicio && r.data <= q.fim,
        );
        const total = meus.reduce((s, r) => s + (r.quantidade || 1), 0);
        const soma = (st: string) =>
          meus.filter((r) => r.status === st).reduce((s, r) => s + (r.quantidade || 1), 0);
        const presencas = soma("PRESENCA");
        const faltas = soma("FALTA");
        const cancelamentos = soma("CANCELAMENTO");
        const pendentes = soma("AGUARDANDO");
        const confirmadas = presencas + faltas + cancelamentos;
        const pct = (v: number) => (confirmadas ? (v / confirmadas) * 100 : 0);
        return {
          ...p,
          total,
          pendentes,
          presencas,
          faltas,
          cancelamentos,
          pctPresenca: pct(presencas),
          pctFalta: pct(faltas),
          pctCancelamento: pct(cancelamentos),
          pctMeta: p.meta_quinzena > 0 ? (presencas / p.meta_quinzena) * 100 : 0,
        };
      })
      .sort((a, b) => b.presencas - a.presencas);
  }, [perfis, registros, q.inicio, q.fim]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Programadoras</h1>
        <p className="text-sm text-muted-foreground">
          Desempenho de {q.rotulo} e acompanhamento de atividade.
        </p>
      </div>

      {podeGerirEquipe && <GerenciarUsuarios />}

      <div className="surface-panel overflow-x-auto rounded-2xl p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Programadora</TableHead>
              <TableHead className="text-right">Programações</TableHead>
              <TableHead className="text-right">Aguard.</TableHead>
              <TableHead className="text-right">Presenças</TableHead>
              <TableHead className="text-right">Faltas</TableHead>
              <TableHead className="text-right">Cancel.</TableHead>
              <TableHead className="text-right">% Presença</TableHead>
              <TableHead className="text-right">% Falta</TableHead>
              <TableHead className="text-right">% Cancel.</TableHead>
              <TableHead className="text-right">Meta</TableHead>
              <TableHead className="text-right">% Meta</TableHead>
              <TableHead>Último preenchimento</TableHead>
              {podeEditar && <TableHead className="text-center">Ativa</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((l, i) => (
              <TableRow key={l.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="font-medium">
                  <Sigiloso valor={l.nome} />
                  <span className="block text-xs text-muted-foreground">
                    <Sigiloso valor={l.email} tipo="texto" />
                  </span>
                </TableCell>
                <TableCell className="text-right">{fmtNum(l.total)}</TableCell>
                <TableCell className="text-right">{fmtNum(l.pendentes)}</TableCell>
                <TableCell className="text-right">{fmtNum(l.presencas)}</TableCell>
                <TableCell className="text-right">{fmtNum(l.faltas)}</TableCell>
                <TableCell className="text-right">{fmtNum(l.cancelamentos)}</TableCell>
                <TableCell className="text-right">{fmtPct(l.pctPresenca)}</TableCell>
                <TableCell className="text-right">{fmtPct(l.pctFalta)}</TableCell>
                <TableCell className="text-right">{fmtPct(l.pctCancelamento)}</TableCell>
                <TableCell className="text-right">
                  {podeEditar ? (
                    <Input
                      type="number"
                      min={0}
                      className="ml-auto h-8 w-20 text-right"
                      defaultValue={l.meta_quinzena}
                      onBlur={(e) => {
                        const valor = Number(e.target.value) || 0;
                        if (valor === l.meta_quinzena) return;
                        atualizar.mutate(
                          { id: l.id, meta_quinzena: valor },
                          { onSuccess: () => toast.success("Meta atualizada.") },
                        );
                      }}
                    />
                  ) : (
                    fmtNum(l.meta_quinzena)
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {l.meta_quinzena > 0 ? (
                    <Badge variant={l.pctMeta >= 100 ? "default" : "secondary"}>
                      {fmtPct(l.pctMeta)}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>{quando(l.ultimo_preenchimento)}</TableCell>
                {podeEditar && (
                  <TableCell className="text-center">
                    <Switch
                      checked={l.ativo}
                      onCheckedChange={(v) =>
                        atualizar.mutate(
                          { id: l.id, ativo: v },
                          { onSuccess: () => toast.success("Status atualizado.") },
                        )
                      }
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
            {linhas.length === 0 && (
              <TableRow>
                <TableCell colSpan={13} className="py-8 text-center text-muted-foreground">
                  Nenhuma programadora cadastrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function PaginaProtegida() {
  return (
    <RequerAdmin area="Programações da equipe">
      <Pagina />
    </RequerAdmin>
  );
}
