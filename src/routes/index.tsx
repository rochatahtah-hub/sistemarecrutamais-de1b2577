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
import { ResumoAcessos } from "@/components/admin/ResumoAcessos";
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
import { usePermissoes } from "@/lib/permissoes";
import { useCandidatos, useProgramadorasHabilitadas } from "@/lib/programacao";
import { aplicarFiltros, useFiltros } from "@/lib/filtros";
import {
  agregar,
  agregarPor,
  agregarPorProgramadora,
  fmtNum,
  fmtPct,
  gerarAlertas,
  serieTemporal,
  type Granularidade,
  type LinhaAgregada,
} from "@/lib/metricas";
import { METAS_PADRAO } from "@/lib/tipos";
import { SemPlanilha } from "@/components/PlanilhaAtiva";

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
  descricao,
  acao,
  children,
  className,
}: {
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`surface-panel entrada-suave rounded-2xl ${className ?? ""}`}>
      <div className="painel-cabecalho">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
            {titulo}
          </h2>
          {descricao && <p className="mt-0.5 text-xs text-muted-foreground">{descricao}</p>}
        </div>
        {acao}
      </div>
      <div className="p-5">{children}</div>
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
    <ol className="space-y-1">
      {ordenadas.map((l, i) => (
        <li
          key={l.chave}
          className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted/60"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${
                i === 0
                  ? "bg-gold-soft text-accent-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </span>
            <span className="truncate font-medium">
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

/** Saudação dinâmica conforme o horário local do usuário. */
function saudacaoPorHorario(hora = new Date().getHours()) {
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function Dashboard() {
  const { data: registros = [], isLoading } = useVagas();
  const { data: config } = useConfiguracoes();
  const { perfil, podeOperar } = useAuth();
  const podeVerAcessos = usePermissoes().pode("acessos", "visualizar");
  const { data: candidatos = [] } = useCandidatos("", podeOperar);
  const { data: programadorasHabilitadas = [] } = useProgramadorasHabilitadas();
  const priv = usePrivacidade();
  const navigate = useNavigate();
  const { filtros, setFiltros, filtrar } = useFiltros();
  const [granularidade, setGranularidade] = useState<Granularidade>("dia");
  const [metricaEmpresa, setMetricaEmpresa] = useState<keyof LinhaAgregada>("presencas");

  const metas = config?.metas ?? METAS_PADRAO;
  const filtrados = useMemo(() => filtrar(registros), [registros, filtros, filtrar]);
  const total = useMemo(() => agregar(filtrados), [filtrados]);
  /** Somente usuários ativos com permissão efetiva de "Minha Programação". */
  const porColaborador = useMemo(
    () => agregarPorProgramadora(filtrados, programadorasHabilitadas),
    [filtrados, programadorasHabilitadas],
  );
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
    <div className="space-y-8">
      <header className="entrada-suave grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-border/70 pb-6 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
            Visão geral da operação
          </p>
          <h1 className="mt-1.5 truncate text-[26px] font-semibold tracking-tight sm:text-[32px]">
            {saudacaoPorHorario()}, {priv.nome(perfil?.nome ?? "bem-vinda")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {fmtNum(filtrados.length)} registros no filtro atual de {fmtNum(registros.length)} no
            total.
          </p>
        </div>
      </header>

      <div className="space-y-3">
        <AtalhosPeriodo />
        <FiltrosBar registros={registros} />
      </div>

      {podeVerAcessos && <ResumoAcessos />}

      <section className="space-y-4">
        <h2 className="rotulo-secao">Indicadores principais</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CardIndicador
            destaque
            titulo="Vagas fechadas"
            valor={fmtNum(total.confirmadas)}
            detalhe="Confirmadas no período"
            icon={Briefcase}
            tom="ouro"
            onClick={() => irPara("todos")}
          />
          <CardIndicador
            destaque
            titulo="Presenças"
            valor={fmtNum(total.presencas)}
            detalhe={`${fmtPct(total.pctPresenca)} do total`}
            icon={CheckCircle2}
            tom="positivo"
            onClick={() => irPara("PRESENCA")}
          />
          <CardIndicador
            destaque
            titulo="Faltas"
            valor={fmtNum(total.faltas)}
            detalhe={`${fmtPct(total.pctFalta)} do total`}
            icon={XCircle}
            tom="negativo"
            onClick={() => irPara("FALTA")}
          />
          <CardIndicador
            destaque
            titulo="Cancelamentos"
            valor={fmtNum(total.cancelamentos)}
            detalhe={`${fmtPct(total.pctCancelamento)} do total`}
            icon={CalendarX2}
            onClick={() => irPara("CANCELAMENTO")}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="rotulo-secao">Indicadores complementares</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <CardIndicador
          titulo="Vagas programadas"
          valor={fmtNum(total.vagas)}
          detalhe={`${fmtNum(total.pendentes)} aguardando confirmação`}
          icon={Clock}
          onClick={() => irPara("todos")}
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
      </section>

      <Painel
        titulo="Atenção e alertas"
        descricao={`${alertas.length} ponto(s) de atenção no período filtrado`}
      >
        {alertas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum alerta: todos os indicadores estão dentro das metas configuradas.
          </p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {alertas.slice(0, 8).map((a) => (
              <li
                key={`${a.severidade}-${a.titulo}-${a.descricao}`}
                className={`flex gap-3 rounded-xl border p-3.5 ${
                  a.severidade === "critico"
                    ? "border-destructive/25 bg-destructive/[0.06]"
                    : "border-gold/30 bg-gold-soft/60"
                }`}
              >
                <AlertTriangle
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    a.severidade === "critico" ? "text-destructive" : "text-gold"
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

      <section className="space-y-4">
        <h2 className="rotulo-secao">Desempenho da operação</h2>
        <div className="grid gap-4 xl:grid-cols-3">
        <Painel
          className="xl:col-span-2"
          titulo="Evolução temporal"
          descricao="Presenças, faltas e cancelamentos ao longo do tempo"
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
        <Painel titulo="Distribuição geral" descricao="Composição dos resultados confirmados">
          <GraficoDistribuicao agregado={total} />
        </Painel>
        <Painel className="xl:col-span-2" titulo="Desempenho por colaborador">
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
      </section>

      <section className="space-y-4">
        <h2 className="rotulo-secao">Rankings de empresas</h2>
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
      </section>

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
              <TableRow>
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
                  <TableRow key={l.chave}>
                    <TableCell className="font-medium">
                      <Link
                        to="/empresas/$nome"
                        params={{ nome: encodeURIComponent(l.nome) }}
                        className="font-medium text-foreground underline-offset-4 transition-colors hover:text-gold hover:underline"
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
