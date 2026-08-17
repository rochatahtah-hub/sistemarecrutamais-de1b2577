import { useMemo, useState } from "react";
import { Sigiloso, usePrivacidade } from "@/lib/privacidade";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  CalendarX2,
  CheckCircle2,
  Trophy,
  XCircle,
} from "lucide-react";

import { CardIndicador } from "./CardIndicador";
import { GraficoEvolucao } from "./Graficos";
import { FiltrosBar } from "@/components/FiltrosBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  agregar,
  agregarPor,
  fmtData,
  fmtNum,
  fmtPct,
  serieTemporal,
  variacao,
  type Granularidade,
} from "@/lib/metricas";
import { SITUACAO_LABEL, STATUS_LABEL } from "@/lib/tipos";
import { SemPlanilha } from "@/components/PlanilhaAtiva";

export function DetalhePerfil({ tipo, nome }: { tipo: "colaborador" | "empresa"; nome: string }) {
  const priv = usePrivacidade();
  const { data: registros = [], isLoading } = useVagas();
  const { filtros, filtrar } = useFiltros();
  const [granularidade, setGranularidade] = useState<Granularidade>("quinzena");
  const [pagina, setPagina] = useState(0);
  const porPagina = 25;

  const filtrados = useMemo(() => filtrar(registros), [registros, filtros, filtrar]);
  const meus = useMemo(
    () => filtrados.filter((r) => (tipo === "colaborador" ? r.colaborador : r.empresa) === nome),
    [filtrados, tipo, nome],
  );
  const total = useMemo(() => agregar(meus), [meus]);
  const ranking = useMemo(() => {
    const linhas = agregarPor(filtrados, tipo).sort((a, b) => b.pctPresenca - a.pctPresenca);
    return { posicao: linhas.findIndex((l) => l.nome === nome) + 1, totalLinhas: linhas.length };
  }, [filtrados, tipo, nome]);
  const relacionados = useMemo(
    () => agregarPor(meus, tipo === "colaborador" ? "empresa" : "colaborador"),
    [meus, tipo],
  );
  const serie = useMemo(() => serieTemporal(meus, granularidade), [meus, granularidade]);

  /** Comparação com a média geral e detecção de queda de desempenho. */
  const geral = useMemo(() => agregar(filtrados), [filtrados]);
  const fechadas = useMemo(
    () => meus.filter((r) => r.situacao === "FECHADA" || r.status !== "AGUARDANDO").length,
    [meus],
  );
  const queda = useMemo(() => {
    if (serie.length < 2) return null;
    const atual = serie[serie.length - 1]!;
    const anterior = serie[serie.length - 2]!;
    const delta = variacao(atual.pctPresenca, anterior.pctPresenca);
    if (delta > -10) return null;
    return { delta, atual, anterior };
  }, [serie]);

  const comparativos = [
    { label: "Taxa de presença", meu: total.pctPresenca, media: geral.pctPresenca, bom: true },
    { label: "Taxa de falta", meu: total.pctFalta, media: geral.pctFalta, bom: false },
    {
      label: "Taxa de cancelamento",
      meu: total.pctCancelamento,
      media: geral.pctCancelamento,
      bom: false,
    },
  ];

  const ordenados = useMemo(() => [...meus].sort((a, b) => b.data.localeCompare(a.data)), [meus]);
  const paginados = ordenados.slice(pagina * porPagina, pagina * porPagina + porPagina);
  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / porPagina));

  if (!isLoading && registros.length === 0) return <SemPlanilha pagina="Este perfil" />;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to={tipo === "colaborador" ? "/colaboradores" : "/empresas"}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Link>
      </Button>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold">
          <Sigiloso valor={nome} tipo={tipo === "empresa" ? "empresa" : "nome"} />
        </h1>
        <Badge variant="outline" className="border-primary/40 text-primary">
          <Trophy className="mr-1 h-3 w-3" />
          {ranking.posicao > 0
            ? `${ranking.posicao}º de ${ranking.totalLinhas} em % de presença`
            : "Sem ranking"}
        </Badge>
      </div>

      <FiltrosBar registros={registros} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CardIndicador titulo="Total de vagas" valor={fmtNum(total.vagas)} icon={Briefcase} tom="ouro" />
        <CardIndicador titulo="Vagas fechadas" valor={fmtNum(fechadas)} icon={Briefcase} />
        <CardIndicador
          titulo="Presenças"
          valor={fmtNum(total.presencas)}
          detalhe={fmtPct(total.pctPresenca)}
          icon={CheckCircle2}
          tom="positivo"
        />
        <CardIndicador
          titulo="Faltas"
          valor={fmtNum(total.faltas)}
          detalhe={fmtPct(total.pctFalta)}
          icon={XCircle}
          tom="negativo"
        />
        <CardIndicador
          titulo="Cancelamentos"
          valor={fmtNum(total.cancelamentos)}
          detalhe={fmtPct(total.pctCancelamento)}
          icon={CalendarX2}
        />
      </div>

      <section className="surface-panel rounded-2xl p-4">
        <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Desempenho {tipo === "empresa" ? "da empresa" : "do colaborador"} vs. média geral
        </h2>
        {queda && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
            <p>
              <strong className="text-destructive">Queda significativa de desempenho:</strong>{" "}
              presença caiu {fmtPct(Math.abs(queda.delta))} de {queda.anterior.periodo} (
              {fmtPct(queda.anterior.pctPresenca)}) para {queda.atual.periodo} (
              {fmtPct(queda.atual.pctPresenca)}).
            </p>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          {comparativos.map((c) => {
            const dif = c.meu - c.media;
            const positivo = c.bom ? dif >= 0 : dif <= 0;
            return (
              <div key={c.label} className="rounded-lg border border-border p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{c.label}</p>
                <p className="font-display text-xl font-bold">{fmtPct(c.meu)}</p>
                <p className={positivo ? "text-xs text-success" : "text-xs text-destructive"}>
                  {dif >= 0 ? "+" : "−"}
                  {fmtPct(Math.abs(dif))} vs. média geral ({fmtPct(c.media)})
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="surface-panel rounded-2xl p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Evolução
            </h2>
            <Select value={granularidade} onValueChange={(v) => setGranularidade(v as Granularidade)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dia">Por dia</SelectItem>
                <SelectItem value="semana">Por semana</SelectItem>
                <SelectItem value="quinzena">Por quinzena</SelectItem>
                <SelectItem value="mes">Por mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <GraficoEvolucao dados={serie} />
        </section>

        <section className="surface-panel rounded-2xl p-4">
          <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {tipo === "colaborador" ? "Empresas atendidas" : "Colaboradores responsáveis"}
          </h2>
          <div className="max-h-[320px] overflow-y-auto pr-1">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Vagas</TableHead>
                  <TableHead className="text-right">% Presença</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relacionados.map((l) => (
                  <TableRow key={l.chave}>
                    <TableCell className="font-medium">
                      <Sigiloso
                        valor={l.nome}
                        tipo={tipo === "colaborador" ? "empresa" : "nome"}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtNum(l.vagas)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtPct(l.pctPresenca)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>
        </section>
      </div>

      <section className="surface-panel rounded-2xl p-4">
        <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Vagas detalhadas ({fmtNum(ordenados.length)})
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>{tipo === "colaborador" ? "Empresa" : "Colaborador"}</TableHead>
                <TableHead>Vaga</TableHead>
                <TableHead className="text-right">Qtd.</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginados.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">{fmtData(r.data)}</TableCell>
                  <TableCell>
                    {tipo === "colaborador" ? (
                      <Sigiloso valor={r.empresa} tipo="empresa" />
                    ) : (
                      <Sigiloso valor={r.colaborador} />
                    )}
                  </TableCell>
                   <TableCell>{priv.privado ? priv.texto(r.cargo || r.descricao) : (r.cargo || r.descricao || "—")}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.quantidade}</TableCell>
                  <TableCell>{SITUACAO_LABEL[r.situacao] ?? r.situacao}</TableCell>
                  <TableCell>{STATUS_LABEL[r.status] ?? r.status}</TableCell>
                  <TableCell className="max-w-[240px] truncate text-muted-foreground">
                     {priv.privado ? priv.texto(r.observacao) : (r.observacao || "—")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {totalPaginas > 1 && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <Button variant="outline" size="sm" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>
              Anterior
            </Button>
            <span className="text-muted-foreground">
              Página {pagina + 1} de {totalPaginas}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagina >= totalPaginas - 1}
              onClick={() => setPagina((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}