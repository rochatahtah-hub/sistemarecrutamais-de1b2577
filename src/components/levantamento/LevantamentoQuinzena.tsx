import { useMemo, useRef, useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { EstadoVazio } from "@/components/EstadoVazio";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GraficoBarraMetrica, GraficoDistribuicao } from "@/components/dashboard/Graficos";
import { fmtData, fmtNum, fmtPct, type LinhaAgregada } from "@/lib/metricas";
import { usePermissoes } from "@/lib/permissoes";
import { useLevantamentoQuinzena } from "@/lib/levantamento-diario";
import {
  periodoQuinzena,
  quinzenaDaData,
  type LinhaQuinzenaProgramador,
  type Quinzena,
} from "@/lib/levantamento-quinzena";

const RANKINGS = [
  { chave: "vagas", titulo: "Vagas adicionadas", formatar: fmtNum },
  { chave: "pctPresenca", titulo: "% Presença", formatar: fmtPct },
  { chave: "pctFalta", titulo: "% Falta", formatar: fmtPct },
  { chave: "pctCancelamento", titulo: "% Cancelamento", formatar: fmtPct },
] as const;

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** A linha consolidada já é um Agregado — o gráfico reaproveita sem conversão de fórmula. */
function paraLinhaAgregada(l: LinhaQuinzenaProgramador): LinhaAgregada {
  return { ...l, chave: l.programadoraId, nome: l.nome };
}

/** Mostra como o total da quinzena foi composto, dia a dia. */
function DetalheDialog({
  linha,
  onFechar,
}: {
  linha: LinhaQuinzenaProgramador | null;
  onFechar: () => void;
}) {
  return (
    <Dialog open={Boolean(linha)} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{linha?.nome}</DialogTitle>
          <DialogDescription>
            Dias que compõem o total da quinzena. Só aparecem dias com levantamento gerado.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dia</TableHead>
                <TableHead className="text-right">Vagas</TableHead>
                <TableHead className="text-right">Aguardando</TableHead>
                <TableHead className="text-right">Presenças</TableHead>
                <TableHead className="text-right">Faltas</TableHead>
                <TableHead className="text-right">Cancel.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linha?.dias.map((d) => (
                <TableRow key={d.data}>
                  <TableCell>{fmtData(d.data)}</TableCell>
                  <TableCell className="text-right">{fmtNum(d.vagas)}</TableCell>
                  <TableCell className="text-right">{fmtNum(d.pendentes)}</TableCell>
                  <TableCell className="text-right">{fmtNum(d.presencas)}</TableCell>
                  <TableCell className="text-right">{fmtNum(d.faltas)}</TableCell>
                  <TableCell className="text-right">{fmtNum(d.cancelamentos)}</TableCell>
                </TableRow>
              ))}
              {linha && (
                <TableRow className="font-semibold">
                  <TableCell>Total da quinzena</TableCell>
                  <TableCell className="text-right">{fmtNum(linha.vagas)}</TableCell>
                  <TableCell className="text-right">{fmtNum(linha.pendentes)}</TableCell>
                  <TableCell className="text-right">{fmtNum(linha.presencas)}</TableCell>
                  <TableCell className="text-right">{fmtNum(linha.faltas)}</TableCell>
                  <TableCell className="text-right">{fmtNum(linha.cancelamentos)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Levantamento da Quinzena — consolida os levantamentos diários já gravados no
 * período. Não gera, não reprocessa e não grava nada: é só leitura.
 */
export function LevantamentoQuinzena() {
  const { pode } = usePermissoes();
  const hoje = useMemo(() => new Date(), []);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [quinzena, setQuinzena] = useState<Quinzena>(() =>
    quinzenaDaData(hoje.toISOString().slice(0, 10)),
  );
  const [detalhe, setDetalhe] = useState<LinhaQuinzenaProgramador | null>(null);
  const [exportando, setExportando] = useState(false);

  const periodo = useMemo(() => periodoQuinzena(ano, mes, quinzena), [ano, mes, quinzena]);
  const { data: consolidado, isLoading } = useLevantamentoQuinzena(periodo);

  const refPizza = useRef<HTMLDivElement>(null);
  const refsBarra = {
    vagas: useRef<HTMLDivElement>(null),
    pctPresenca: useRef<HTMLDivElement>(null),
    pctFalta: useRef<HTMLDivElement>(null),
    pctCancelamento: useRef<HTMLDivElement>(null),
  };

  const porProgramador = useMemo(() => consolidado?.porProgramador ?? [], [consolidado]);
  const linhasGrafico = useMemo(() => porProgramador.map(paraLinhaAgregada), [porProgramador]);

  const anos = useMemo(() => {
    const atual = hoje.getFullYear();
    return [atual + 1, atual, atual - 1, atual - 2];
  }, [hoje]);

  async function exportarPdf() {
    if (!consolidado) return;
    setExportando(true);
    try {
      const { exportarLevantamentoQuinzenaPdf } = await import("@/lib/levantamento-quinzena-pdf");
      await exportarLevantamentoQuinzenaPdf({
        consolidado,
        tituloPeriodo: `${quinzena}ª quinzena de ${MESES[mes - 1]} de ${ano}`,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((nome, i) => (
                <SelectItem key={nome} value={String(i + 1)}>
                  {nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {anos.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(quinzena)}
            onValueChange={(v) => setQuinzena(Number(v) as Quinzena)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1ª quinzena</SelectItem>
              <SelectItem value="2">2ª quinzena</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {pode("levantamento_diario", "exportar") && (
          <Button
            variant="outline"
            size="sm"
            disabled={exportando || !consolidado}
            onClick={exportarPdf}
          >
            {exportando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            Exportar Levantamento da Quinzena
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Período analisado:{" "}
        <strong className="text-foreground">
          {fmtData(periodo.inicio)} a {fmtData(periodo.fim)}
        </strong>
        {consolidado && ` — ${consolidado.diasComDados.length} dia(s) com levantamento gerado`}
      </p>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !consolidado || consolidado.totais.vagas === 0 ? (
        <EstadoVazio
          titulo="Nenhum levantamento diário no período"
          descricao="A quinzena soma os levantamentos diários já gerados. Gere os dias que faltam na aba Diário."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Vagas adicionadas", fmtNum(consolidado.totais.vagas)],
              ["Aguardando confirmação", fmtNum(consolidado.totais.pendentes)],
              ["% Presença", fmtPct(consolidado.totais.pctPresenca)],
              ["% Falta", fmtPct(consolidado.totais.pctFalta)],
              ["% Cancelamento", fmtPct(consolidado.totais.pctCancelamento)],
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Desempenho por Programador na quinzena</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Programador</TableHead>
                      <TableHead>Vagas adicionadas</TableHead>
                      <TableHead>Aguardando</TableHead>
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
                        className={
                          pode("levantamento_diario", "detalhar")
                            ? "cursor-pointer hover:bg-muted/40"
                            : ""
                        }
                        onClick={() => pode("levantamento_diario", "detalhar") && setDetalhe(l)}
                      >
                        <TableCell className="font-medium">{l.nome}</TableCell>
                        <TableCell>{fmtNum(l.vagas)}</TableCell>
                        <TableCell>{fmtNum(l.pendentes)}</TableCell>
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
                <GraficoDistribuicao agregado={consolidado.totais} />
              </div>
            </CardContent>
          </Card>

          {RANKINGS.map((r) => (
            <Card key={r.chave}>
              <CardHeader>
                <CardTitle className="text-base">Ranking — {r.titulo} (menor → maior)</CardTitle>
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
                      {[...porProgramador]
                        .sort((a, b) => a[r.chave] - b[r.chave])
                        .map((l) => (
                          <TableRow key={l.programadoraId}>
                            <TableCell>{l.nome}</TableCell>
                            <TableCell>{r.formatar(l[r.chave])}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
                <div ref={refsBarra[r.chave]}>
                  <GraficoBarraMetrica
                    linhas={[...linhasGrafico].sort((a, b) => a[r.chave] - b[r.chave])}
                    metrica={r.chave}
                    rotulo={r.titulo}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      <DetalheDialog linha={detalhe} onFechar={() => setDetalhe(null)} />
    </div>
  );
}
