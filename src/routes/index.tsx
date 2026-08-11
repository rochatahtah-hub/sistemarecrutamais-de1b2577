import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Briefcase,
  Building2,
  CalendarX2,
  CheckCircle2,
  Clock,
  IdCard,
  Users,
  XCircle,
} from "lucide-react";

import { FiltrosBar } from "@/components/FiltrosBar";
import { AtalhosPeriodo } from "@/components/AtalhosPeriodo";
import { CardIndicador } from "@/components/dashboard/CardIndicador";
import { TabelaDesempenho } from "@/components/dashboard/TabelaDesempenho";
import {
  GraficoBarraMetrica,
  GraficoBarrasStatus,
  GraficoDistribuicao,
  GraficoEvolucao,
} from "@/components/dashboard/Graficos";
import { Button } from "@/components/ui/button";
import { Sigiloso, usePrivacidade } from "@/lib/privacidade";
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
import { useConfiguracoes, useVagas } from "@/lib/dados";
import { useAuth } from "@/lib/auth";
import { useCandidatos } from "@/lib/programacao";
import { aplicarFiltros, useFiltros } from "@/lib/filtros";
import {
  agregar,
  agregarPor,
  fmtNum,
  fmtPct,
  gerarAlertas,
  serieTemporal,
  type Granularidade,
  type LinhaAgregada,
} from "@/lib/metricas";
import { METAS_PADRAO } from "@/lib/tipos";
import { PlanilhaAtivaBanner, SemPlanilha } from "@/components/PlanilhaAtiva";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard | RECRUTA+" },
      {
        name: "description",
        content:
          "Indicadores de vagas fechadas, presenças, faltas e cancelamentos com rankings e gráficos.",
      },
      { property: "og:title", content: "Dashboard | RECRUTA+" },
      {
        property: "og:description",
        content: "Acompanhe presenças, faltas e cancelamentos por colaborador, empresa e período.",
      },
    ],
  }),
  component: Dashboard,
});

function Painel({
  titulo,
  acao,
  children,
}: {
  titulo: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-panel rounded-xl p-4">
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {titulo}
        </h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

function ListaTop({
  linhas,
  campo,
  sufixo,
  sensivel = false,
}: {
  linhas: LinhaAgregada[];
  campo: keyof LinhaAgregada;
  sufixo: "num" | "pct";
  sensivel?: boolean;
}) {
  const priv = usePrivacidade();
  const ordenadas = [...linhas].sort((a, b) => Number(b[campo]) - Number(a[campo])).slice(0, 5);
  if (ordenadas.length === 0)
    return <p className="text-sm text-muted-foreground">Sem dados.</p>;
  return (
    <ol className="space-y-2">
      {ordenadas.map((l, i) => (
        <li key={l.chave} className="flex items-center justify-between gap-3 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-secondary text-[11px] font-semibold text-primary">
              {i + 1}
            </span>
            <span className="truncate">
              {sensivel ? priv.nome(l.nome) : priv.empresa(l.nome)}
            </span>
          </span>
          <span className="shrink-0 tabular-nums font-semibold">
            {priv.privado
              ? priv.numero(Number(l[campo]))
              : sufixo === "pct"
                ? fmtPct(Number(l[campo]))
                : fmtNum(Number(l[campo]))}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              ({priv.privado ? priv.numero(l.vagas) : fmtNum(l.vagas)} vagas)
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Dashboard() {
  const { data: registros = [], isLoading } = useVagas();
  const { data: config } = useConfiguracoes();
  const { data: candidatos = [] } = useCandidatos("");
  const { perfil, isAdmin } = useAuth();
  const priv = usePrivacidade();
  const navigate = useNavigate();
  const { filtros, setFiltros } = useFiltros();
  const [granularidade, setGranularidade] = useState<Granularidade>("dia");
  const [metricaEmpresa, setMetricaEmpresa] = useState<keyof LinhaAgregada>("presencas");

  const metas = config?.metas ?? METAS_PADRAO;
  const filtrados = useMemo(() => aplicarFiltros(registros, filtros), [registros, filtros]);
  const total = useMemo(() => agregar(filtrados), [filtrados]);
  const porColaborador = useMemo(() => agregarPor(filtrados, "colaborador"), [filtrados]);
  const porEmpresa = useMemo(() => agregarPor(filtrados, "empresa"), [filtrados]);
  const serie = useMemo(() => serieTemporal(filtrados, granularidade), [filtrados, granularidade]);
  const alertas = useMemo(() => gerarAlertas(filtrados, metas), [filtrados, metas]);
  const nomesSensiveis = useMemo(
    () => ({
      empresas: Array.from(new Set(registros.map((r) => r.empresa).filter(Boolean))) as string[],
      pessoas: Array.from(
        new Set(
          registros.flatMap((r) => [r.colaborador, r.candidato].filter(Boolean) as string[]),
        ),
      ),
    }),
    [registros],
  );

  const rotuloMetrica: Record<string, string> = {
    presencas: "Presenças",
    faltas: "Faltas",
    cancelamentos: "Cancelamentos",
    pctPresenca: "% Presença",
    pctFalta: "% Faltas",
  };

  const irPara = (status: string) => {
    setFiltros({ status });
    void navigate({ to: "/vagas" });
  };

  if (!isLoading && registros.length === 0) {
    return <SemPlanilha pagina="O Dashboard" />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">
          Olá, {priv.nome(perfil?.nome ?? "bem-vinda")}
        </h1>
        <p className="text-sm font-medium text-primary">Visão geral da operação</p>
        <p className="text-sm text-muted-foreground">
          {fmtNum(filtrados.length)} registros no filtro atual de {fmtNum(registros.length)} no total.
        </p>
      </div>

      <AtalhosPeriodo />
      <FiltrosBar registros={registros} />
      <PlanilhaAtivaBanner />

      {isAdmin && <ResumoAcessos />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <CardIndicador
          titulo="Vagas programadas"
          valor={fmtNum(total.vagas)}
          detalhe={`${fmtNum(total.pendentes)} aguardando confirmação`}
          icon={Clock}
          onClick={() => irPara("todos")}
        />
        <CardIndicador
          titulo="Vagas fechadas"
          valor={fmtNum(total.confirmadas)}
          detalhe="Confirmadas no período"
          icon={Briefcase}
          tom="ouro"
          onClick={() => irPara("todos")}
        />
        <CardIndicador
          titulo="Presenças"
          valor={fmtNum(total.presencas)}
          detalhe={`${fmtPct(total.pctPresenca)} do total`}
          icon={CheckCircle2}
          tom="positivo"
          onClick={() => irPara("PRESENCA")}
        />
        <CardIndicador
          titulo="Faltas"
          valor={fmtNum(total.faltas)}
          detalhe={`${fmtPct(total.pctFalta)} do total`}
          icon={XCircle}
          tom="negativo"
          onClick={() => irPara("FALTA")}
        />
        <CardIndicador
          titulo="Cancelamentos"
          valor={fmtNum(total.cancelamentos)}
          detalhe={`${fmtPct(total.pctCancelamento)} do total`}
          icon={CalendarX2}
          onClick={() => irPara("CANCELAMENTO")}
        />
        <CardIndicador
          titulo="Taxa de presença"
          valor={fmtPct(total.pctPresenca)}
          detalhe={`Meta ${metas.presenca}%`}
          icon={CheckCircle2}
          tom="positivo"
          onClick={() => irPara("PRESENCA")}
        />
        <CardIndicador
          titulo="Taxa de falta"
          valor={fmtPct(total.pctFalta)}
          detalhe={`Meta máx. ${metas.falta}%`}
          icon={XCircle}
          tom="negativo"
          onClick={() => irPara("FALTA")}
        />
        <CardIndicador
          titulo="Taxa de cancelamento"
          valor={fmtPct(total.pctCancelamento)}
          detalhe={`Meta máx. ${metas.cancelamento}%`}
          icon={CalendarX2}
          onClick={() => irPara("CANCELAMENTO")}
        />
        <CardIndicador
          titulo="Total de candidatos"
          valor={fmtNum(candidatos.length)}
          icon={IdCard}
          onClick={() => void navigate({ to: "/candidatos" })}
        />
        <CardIndicador titulo="Colaboradores" valor={fmtNum(porColaborador.length)} icon={Users} />
        <CardIndicador titulo="Empresas" valor={fmtNum(porEmpresa.length)} icon={Building2} />
      </div>

      <Painel titulo={`Atenção / Alertas (${alertas.length})`}>
        {alertas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum alerta: todos os indicadores estão dentro das metas configuradas.
          </p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {alertas.slice(0, 8).map((a) => (
              <li
                key={`${a.severidade}-${a.titulo}-${a.descricao}`}
                className={`flex gap-3 rounded-lg border p-3 ${
                  a.severidade === "critico"
                    ? "border-destructive/40 bg-destructive/10"
                    : "border-primary/30 bg-primary/5"
                }`}
              >
                <AlertTriangle
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    a.severidade === "critico" ? "text-destructive" : "text-primary"
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{priv.frase(a.titulo, nomesSensiveis)}</p>
                  <p className="text-xs text-muted-foreground">
                    {priv.frase(a.descricao, nomesSensiveis)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Painel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Painel titulo="Distribuição geral">
          <GraficoDistribuicao agregado={total} />
        </Painel>
        <Painel
          titulo="Evolução temporal"
          acao={
            <Select value={granularidade} onValueChange={(v) => setGranularidade(v as Granularidade)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dia">Por dia</SelectItem>
                <SelectItem value="semana">Por semana</SelectItem>
                <SelectItem value="quinzena">Por quinzena</SelectItem>
                <SelectItem value="mes">Por mês</SelectItem>
              </SelectContent>
            </Select>
          }
        >
          <GraficoEvolucao dados={serie} />
        </Painel>
        <Painel titulo="Desempenho por colaborador">
          <GraficoBarrasStatus linhas={porColaborador.slice(0, 10)} sensivel />
        </Painel>
        <Painel
          titulo="Ranking de empresas"
          acao={
            <Select
              value={metricaEmpresa as string}
              onValueChange={(v) => setMetricaEmpresa(v as keyof LinhaAgregada)}
            >
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(rotuloMetrica).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          <GraficoBarraMetrica
            linhas={[...porEmpresa]
              .sort((a, b) => Number(b[metricaEmpresa]) - Number(a[metricaEmpresa]))
              .slice(0, 10)}
            metrica={metricaEmpresa}
            rotulo={rotuloMetrica[metricaEmpresa as string] ?? ""}
          />
        </Painel>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Painel titulo="Top empresas em presenças">
          <ListaTop linhas={porEmpresa} campo="presencas" sufixo="num" />
        </Painel>
        <Painel titulo="Top empresas em faltas (qtd.)">
          <ListaTop linhas={porEmpresa} campo="faltas" sufixo="num" />
        </Painel>
        <Painel titulo="Maior taxa de faltas (%)">
          <ListaTop linhas={porEmpresa.filter((e) => e.vagas >= 5)} campo="pctFalta" sufixo="pct" />
        </Painel>
        <Painel titulo="Top empresas em cancelamentos">
          <ListaTop linhas={porEmpresa} campo="cancelamentos" sufixo="num" />
        </Painel>
      </div>

      <Painel
        titulo="Desempenho dos colaboradores"
        acao={
          <Button variant="outline" size="sm" asChild>
            <Link to="/colaboradores">Ver tudo</Link>
          </Button>
        }
      >
        <TabelaDesempenho
          linhas={porColaborador.slice(0, 10)}
          destino="colaboradores"
          metaPresenca={metas.presenca}
        />
      </Painel>

      <Painel titulo="Ranking de empresas por faltas">
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40">
                <TableHead>Empresa</TableHead>
                <TableHead className="text-right">Vagas fechadas</TableHead>
                <TableHead className="text-right">Presenças</TableHead>
                <TableHead className="text-right">Faltas</TableHead>
                <TableHead className="text-right">Cancelamentos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porEmpresa.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Nenhum dado para os filtros selecionados.
                  </TableCell>
                </TableRow>
              )}
              {[...porEmpresa]
                .sort((a, b) => b.faltas - a.faltas || b.vagas - a.vagas)
                .map((l) => (
                  <TableRow key={l.chave} className="hover:bg-secondary/30">
                    <TableCell className="font-medium">
                      <Link
                        to="/empresas/$nome"
                        params={{ nome: encodeURIComponent(l.nome) }}
                        className="text-primary hover:underline"
                      >
                        <Sigiloso valor={l.nome} tipo="empresa" />
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <Sigiloso valor={fmtNum(l.vagas)} tipo="numero" />
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-success">
                      <Sigiloso valor={fmtNum(l.presencas)} tipo="numero" />
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">
                      <Sigiloso valor={fmtNum(l.faltas)} tipo="numero" />
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-warning">
                      <Sigiloso valor={fmtNum(l.cancelamentos)} tipo="numero" />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </Painel>

      <Painel
        titulo="Desempenho das empresas"
        acao={
          <Button variant="outline" size="sm" asChild>
            <Link to="/empresas">Ver tudo</Link>
          </Button>
        }
      >
        <TabelaDesempenho
          linhas={porEmpresa.slice(0, 10)}
          destino="empresas"
          metaPresenca={metas.presenca}
        />
      </Painel>
    </div>
  );
}
