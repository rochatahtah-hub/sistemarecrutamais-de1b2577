import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, FileDown, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { EstadoVazio } from "@/components/EstadoVazio";
import { RequerPermissao } from "@/components/RequerPermissao";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePermissoes } from "@/lib/permissoes";
import { fmtData, fmtNum, fmtPct, type Agregado, type LinhaAgregada } from "@/lib/metricas";
import { ontemBrasilia } from "@/lib/levantamento-diario-calculo";
import { STATUS_LABEL } from "@/lib/tipos";
import {
  useConfigLevantamentoDiario,
  useDrillDownVagas,
  useHistoricoLevantamentosDiarios,
  useLevantamentoDiario,
  useReprocessarLevantamentoDiario,
  useSalvarConfigLevantamentoDiario,
  type LevantamentoDiarioProgramador,
  type LevantamentoDiarioResumo,
} from "@/lib/levantamento-diario";
import { GraficoBarraMetrica, GraficoDistribuicao } from "@/components/dashboard/Graficos";

export const Route = createFileRoute("/levantamento-diario")({
  head: () => ({
    meta: [
      { title: "Levantamento Diário | Recruta+" },
      {
        name: "description",
        content: "Vagas fechadas no dia, agrupadas por programador, geradas automaticamente.",
      },
      { property: "og:title", content: "Levantamento Diário | Recruta+" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PaginaProtegida,
});

const RANKINGS = [
  {
    chave: "vagas" as const,
    titulo: "Vagas fechadas",
    campo: "vagasFechadas" as const,
    formatar: fmtNum,
  },
  {
    chave: "pctPresenca" as const,
    titulo: "% Presença",
    campo: "pctPresenca" as const,
    formatar: fmtPct,
  },
  { chave: "pctFalta" as const, titulo: "% Falta", campo: "pctFalta" as const, formatar: fmtPct },
  {
    chave: "pctCancelamento" as const,
    titulo: "% Cancelamento",
    campo: "pctCancelamento" as const,
    formatar: fmtPct,
  },
];

/** Adapta o resumo persistido para o formato usado pelo gráfico de pizza do Dashboard. */
function paraAgregado(r: LevantamentoDiarioResumo): Agregado {
  return {
    vagas: r.vagasFechadas,
    pendentes: 0,
    confirmadas: r.vagasFechadas,
    presencas: r.presencas,
    faltas: r.faltas,
    cancelamentos: r.cancelamentos,
    pctPresenca: r.pctPresenca,
    pctFalta: r.pctFalta,
    pctCancelamento: r.pctCancelamento,
  };
}

/** Adapta a linha persistida (colunas do banco) para o formato reaproveitado pelos gráficos do Dashboard. */
function paraLinhaAgregada(l: LevantamentoDiarioProgramador): LinhaAgregada {
  return {
    chave: l.programadoraId,
    nome: l.nome,
    vagas: l.vagasFechadas,
    pendentes: 0,
    confirmadas: l.vagasFechadas,
    presencas: l.presencas,
    faltas: l.faltas,
    cancelamentos: l.cancelamentos,
    pctPresenca: l.pctPresenca,
    pctFalta: l.pctFalta,
    pctCancelamento: l.pctCancelamento,
  };
}

function DrillDownDialog({
  linha,
  onFechar,
}: {
  linha: LevantamentoDiarioProgramador | null;
  onFechar: () => void;
}) {
  const { data: vagas = [], isLoading } = useDrillDownVagas(linha?.vagaIds ?? []);
  return (
    <Dialog open={Boolean(linha)} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{linha?.nome}</DialogTitle>
          <DialogDescription>
            As {linha?.vagasFechadas} vagas exatas usadas neste cálculo — a mesma fonte da tabela,
            dos gráficos e do PDF.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Vaga</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Data programada</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vagas.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{v.empresa}</TableCell>
                    <TableCell>{v.cargo || "—"}</TableCell>
                    <TableCell>{v.colaborador}</TableCell>
                    <TableCell>{fmtData(v.dataProgramada)}</TableCell>
                    <TableCell>{STATUS_LABEL[v.status] ?? v.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConfiguracaoHorario() {
  const { data: config } = useConfigLevantamentoDiario();
  const salvar = useSalvarConfigLevantamentoDiario();
  const [hora, setHora] = useState<string>(String(config?.hora_geracao ?? 18));

  if (!config) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Geração automática</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="ld-ativo"
            checked={config.ativo}
            disabled={salvar.isPending}
            onCheckedChange={(ativo) =>
              salvar.mutate(
                { horaGeracao: Number(hora), ativo },
                { onError: (e) => toast.error((e as Error).message) },
              )
            }
          />
          <Label htmlFor="ld-ativo">Ativa</Label>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Gerar todo dia às</Label>
          <Select
            value={hora}
            onValueChange={(v) => {
              setHora(v);
              salvar.mutate(
                { horaGeracao: Number(v), ativo: config.ativo },
                { onError: (e) => toast.error((e as Error).message) },
              );
            }}
          >
            <SelectTrigger className="w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 24 }, (_, h) => (
                <SelectItem key={h} value={String(h)}>
                  {String(h).padStart(2, "0")}h
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">(horário de Brasília)</span>
        </div>
      </CardContent>
    </Card>
  );
}

function Pagina() {
  const { pode } = usePermissoes();
  const [data, setData] = useState(() => ontemBrasilia());
  const { data: levantamento, isLoading } = useLevantamentoDiario(data);
  const { data: historico = [] } = useHistoricoLevantamentosDiarios();
  const reprocessar = useReprocessarLevantamentoDiario();
  const [drillDown, setDrillDown] = useState<LevantamentoDiarioProgramador | null>(null);
  const [exportando, setExportando] = useState(false);

  const refPizza = useRef<HTMLDivElement>(null);
  const refsBarra = {
    vagas: useRef<HTMLDivElement>(null),
    pctPresenca: useRef<HTMLDivElement>(null),
    pctFalta: useRef<HTMLDivElement>(null),
    pctCancelamento: useRef<HTMLDivElement>(null),
  };

  const porProgramador = useMemo(() => levantamento?.porProgramador ?? [], [levantamento]);
  const linhasGrafico = useMemo(() => porProgramador.map(paraLinhaAgregada), [porProgramador]);

  const rankings = useMemo(
    () =>
      RANKINGS.map((r) => ({
        ...r,
        linhas: [...porProgramador].sort((a, b) => a[r.campo] - b[r.campo]),
      })),
    [porProgramador],
  );

  async function exportarPdf() {
    if (!levantamento) return;
    setExportando(true);
    try {
      const { exportarLevantamentoDiarioPdf } = await import("@/lib/levantamento-diario-pdf");
      await exportarLevantamentoDiarioPdf({
        resumo: levantamento.resumo,
        porProgramador: levantamento.porProgramador,
        graficoPizza: refPizza.current,
        graficosBarra: {
          vagas: refsBarra.vagas.current,
          pctPresenca: refsBarra.pctPresenca.current,
          pctFalta: refsBarra.pctFalta.current,
          pctCancelamento: refsBarra.pctCancelamento.current,
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar o PDF.");
    } finally {
      setExportando(false);
    }
  }

  function reprocessarAgora() {
    reprocessar.mutate(data, {
      onSuccess: () => toast.success("Levantamento gerado/atualizado."),
      onError: (e) => toast.error((e as Error).message),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Levantamento Diário"
        descricao="Vagas fechadas no dia, agrupadas por programador — gerado automaticamente todo dia."
        icone={<CalendarClock className="h-5 w-5" />}
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              className="w-[160px]"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
            {historico.length > 0 && (
              <Select value={data} onValueChange={setData}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Levantamento de..." />
                </SelectTrigger>
                <SelectContent>
                  {historico.map((h) => (
                    <SelectItem key={h.id} value={h.data_referencia}>
                      Levantamento de {fmtData(h.data_referencia)} ({fmtNum(h.vagas_fechadas)}{" "}
                      vagas)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        }
      />

      {pode("levantamento_diario", "configurar") && <ConfiguracaoHorario />}

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !levantamento ? (
        <EstadoVazio
          titulo="Nenhum levantamento gerado para esta data"
          descricao="A geração automática roda uma vez por dia. Se precisar agora, gere manualmente."
          acao={
            pode("levantamento_diario", "reprocessar") && (
              <Button disabled={reprocessar.isPending} onClick={reprocessarAgora}>
                {reprocessar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Gerar levantamento agora
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <p>
              Data analisada:{" "}
              <strong className="text-foreground">
                {fmtData(levantamento.resumo.dataReferencia)}
              </strong>
              {" — "}Gerado em {new Date(levantamento.resumo.geradoEm).toLocaleString("pt-BR")}
              {levantamento.resumo.vezesReprocessado > 0 &&
                ` — reprocessado ${levantamento.resumo.vezesReprocessado}x, última vez por ${levantamento.resumo.reprocessadoPorNome}`}
            </p>
            <div className="flex items-center gap-2">
              {pode("levantamento_diario", "reprocessar") && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={reprocessar.isPending}>
                      {reprocessar.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Reprocessar levantamento
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reprocessar este levantamento?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Recalcula os números a partir dos dados atuais de {fmtData(data)}. A versão
                        anterior fica registrada no histórico de alterações.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={reprocessarAgora}>Reprocessar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {pode("levantamento_diario", "exportar") && (
                <Button variant="outline" size="sm" disabled={exportando} onClick={exportarPdf}>
                  {exportando ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}
                  Gerar relatório PDF
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Vagas fechadas", fmtNum(levantamento.resumo.vagasFechadas)],
              ["% Presença", fmtPct(levantamento.resumo.pctPresenca)],
              ["% Falta", fmtPct(levantamento.resumo.pctFalta)],
              ["% Cancelamento", fmtPct(levantamento.resumo.pctCancelamento)],
            ].map(([rotulo, valor]) => (
              <Card key={rotulo}>
                <CardContent className="p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    {rotulo}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight">{valor}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {porProgramador.length === 0 ? (
            <EstadoVazio
              titulo="Nenhuma vaga fechada nesta data"
              descricao="Dia sem confirmações registradas — o levantamento existe, apenas zerado."
            />
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Desempenho por Programador</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Programador</TableHead>
                          <TableHead>Vagas fechadas</TableHead>
                          <TableHead>Presenças</TableHead>
                          <TableHead>Faltas</TableHead>
                          <TableHead>Cancelamentos</TableHead>
                          <TableHead>% Presença</TableHead>
                          <TableHead>% Falta</TableHead>
                          <TableHead>% Cancelamento</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {porProgramador.map((l) => (
                          <TableRow
                            key={l.programadoraId}
                            className="cursor-pointer hover:bg-muted/40"
                            onClick={() => setDrillDown(l)}
                          >
                            <TableCell className="font-medium">{l.nome}</TableCell>
                            <TableCell>{fmtNum(l.vagasFechadas)}</TableCell>
                            <TableCell>{fmtNum(l.presencas)}</TableCell>
                            <TableCell>{fmtNum(l.faltas)}</TableCell>
                            <TableCell>{fmtNum(l.cancelamentos)}</TableCell>
                            <TableCell>{fmtPct(l.pctPresenca)}</TableCell>
                            <TableCell>{fmtPct(l.pctFalta)}</TableCell>
                            <TableCell>{fmtPct(l.pctCancelamento)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribuição dos resultados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div ref={refPizza}>
                    <GraficoDistribuicao agregado={paraAgregado(levantamento.resumo)} />
                  </div>
                </CardContent>
              </Card>

              {rankings.map((r) => (
                <Card key={r.chave}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Ranking — {r.titulo} (menor → maior)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Programador</TableHead>
                            <TableHead>{r.titulo}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {r.linhas.map((l) => (
                            <TableRow key={l.programadoraId}>
                              <TableCell>{l.nome}</TableCell>
                              <TableCell>{r.formatar(l[r.campo])}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div ref={refsBarra[r.chave]}>
                      <GraficoBarraMetrica
                        linhas={[...linhasGrafico].sort(
                          (a, b) =>
                            (a[r.chave === "vagas" ? "vagas" : r.chave] as number) -
                            (b[r.chave === "vagas" ? "vagas" : r.chave] as number),
                        )}
                        metrica={r.chave === "vagas" ? "vagas" : r.chave}
                        rotulo={r.titulo}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </>
      )}

      <DrillDownDialog linha={drillDown} onFechar={() => setDrillDown(null)} />
    </div>
  );
}

function PaginaProtegida() {
  return (
    <RequerPermissao modulo="levantamento_diario" area="Levantamento Diário">
      <Pagina />
    </RequerPermissao>
  );
}
