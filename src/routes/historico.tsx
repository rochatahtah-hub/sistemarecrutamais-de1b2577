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
  const podeArquivar = usePermissoes().pode("historico", "editar");
  const { data: registros = [] } = useVagas();
  const { data: arquivadas = [] } = useHistoricoQuinzenas();
  const fechar = useFecharQuinzena();
  const atual = quinzenaAtual();
  const priv = usePrivacidade();
  const { pode } = usePermissoes();
  const excluir = useExcluirFicha();

  const [busca, setBusca] = useState("");
  const [emEdicao, setEmEdicao] = useState<VagaRegistro | null>(null);
  const [paraExcluir, setParaExcluir] = useState<VagaRegistro | null>(null);

  const podeEditar = pode("historico", "editar");
  const podeExcluir = pode("historico", "excluir");

  /** Fichas já processadas (com confirmação registrada). */
  const fichas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return registros
      .filter((r) => r.status !== "AGUARDANDO")
      .filter((r) =>
        termo
          ? `${r.candidato} ${r.descricao} ${r.empresa} ${r.cargo}`.toLowerCase().includes(termo)
          : true,
      )
      .slice(0, 300);
  }, [registros, busca]);

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    try {
      await excluir.mutateAsync(paraExcluir.id);
      toast.success("Ficha excluída. Registro salvo no histórico de alterações.");
      setParaExcluir(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

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
              {podeArquivar && <TableHead />}
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
                {podeArquivar && (
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

      <div className="surface-panel space-y-3 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">
              Fichas processadas ({fmtNum(fichas.length)})
            </h2>
            <p className="text-sm text-muted-foreground">
              Fichas com confirmação registrada. Edite ou exclua conforme suas permissões.
            </p>
          </div>
          <Input
            className="w-full sm:w-72"
            placeholder="Buscar por colaborador, empresa ou cargo"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fichas.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{fmtData(f.data)}</TableCell>
                  <TableCell className="font-medium">
                    {priv.nome(f.candidato || f.descricao || "—")}
                  </TableCell>
                  <TableCell>{priv.empresa(f.empresa)}</TableCell>
                  <TableCell>{f.cargo || "—"}</TableCell>
                  <TableCell>{STATUS_LABEL[f.status] ?? f.status}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar ficha"
                        disabled={!podeEditar}
                        onClick={() => setEmEdicao(f)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir ficha"
                        disabled={!podeExcluir}
                        onClick={() => setParaExcluir(f)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {fichas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nenhuma ficha processada encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <FichaVaga
        vaga={emEdicao}
        registros={registros}
        aberto={Boolean(emEdicao)}
        onFechar={() => setEmEdicao(null)}
      />

      <AlertDialog open={Boolean(paraExcluir)} onOpenChange={(v) => !v && setParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir esta ficha?</AlertDialogTitle>
            <AlertDialogDescription>
              A ficha de {priv.nome(paraExcluir?.candidato || paraExcluir?.descricao || "—")} em{" "}
              {priv.empresa(paraExcluir?.empresa ?? "")} será removida. Fichas com pagamento,
              atendimento ou feedback vinculados não podem ser excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={excluir.isPending}
              onClick={(e) => {
                e.preventDefault();
                void confirmarExclusao();
              }}
            >
              Excluir ficha
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
