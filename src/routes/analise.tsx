import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bot, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";

import { FiltrosBar } from "@/components/FiltrosBar";
import { AtalhosPeriodo } from "@/components/AtalhosPeriodo";
import { SemPlanilha } from "@/components/PlanilhaAtiva";
import { Badge } from "@/components/ui/badge";
import { useConfiguracoes, useVagas } from "@/lib/dados";
import { aplicarFiltros, useFiltros } from "@/lib/filtros";
import { gerarInsights, type Insight } from "@/lib/inteligencia";
import { usePrivacidade } from "@/lib/privacidade";
import { METAS_PADRAO } from "@/lib/tipos";

export const Route = createFileRoute("/analise")({
  head: () => ({
    meta: [
      { title: "Análise Inteligente | RECRUTA+" },
      {
        name: "description",
        content:
          "Análise automática dos dados de recrutamento: variações de presença, faltas, cancelamentos e conversão.",
      },
      { property: "og:title", content: "Análise Inteligente | RECRUTA+" },
      {
        property: "og:description",
        content: "Comparação automática entre períodos com destaques por empresa, vaga e colaborador.",
      },
    ],
  }),
  component: Pagina,
});

const ESCOPO: Record<Insight["escopo"], string> = {
  geral: "Geral",
  empresa: "Empresa",
  colaborador: "Colaborador",
  vaga: "Vaga",
  periodo: "Período",
};

function CartaoInsight({
  insight,
  nomes,
}: {
  insight: Insight;
  nomes: { empresas: string[]; pessoas: string[] };
}) {
  const priv = usePrivacidade();
  const cor =
    insight.severidade === "critico"
      ? "border-destructive/40 bg-destructive/10"
      : insight.severidade === "atencao"
        ? "border-warning/40 bg-warning/10"
        : "border-success/40 bg-success/10";
  const Icone =
    insight.severidade === "positivo"
      ? TrendingUp
      : insight.severidade === "critico"
        ? AlertTriangle
        : TrendingDown;

  return (
    <li className={`flex gap-3 rounded-lg border p-3 ${cor}`}>
      <Icone className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">{priv.frase(insight.titulo, nomes)}</p>
          <Badge variant="secondary">{ESCOPO[insight.escopo]}</Badge>
          <Badge variant="outline">{insight.indicador}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{priv.frase(insight.descricao, nomes)}</p>
      </div>
    </li>
  );
}

function Pagina() {
  const { data: registros = [], isLoading } = useVagas();
  const { data: config } = useConfiguracoes();
  const { filtros } = useFiltros();
  const metas = config?.metas ?? METAS_PADRAO;
  const insights = useMemo(
    () => gerarInsights(aplicarFiltros(registros, filtros), metas),
    [registros, filtros, metas],
  );
  const nomes = useMemo(
    () => ({
      empresas: Array.from(new Set(registros.map((r) => r.empresa).filter(Boolean))),
      pessoas: Array.from(
        new Set(
          registros.flatMap((r) => [r.colaborador, r.candidato].filter(Boolean) as string[]),
        ),
      ),
    }),
    [registros],
  );

  if (!isLoading && registros.length === 0) return <SemPlanilha pagina="A Análise Inteligente" />;

  const criticos = insights.filter((i) => i.severidade === "critico");
  const atencao = insights.filter((i) => i.severidade === "atencao");
  const positivos = insights.filter((i) => i.severidade === "positivo");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          <Bot className="h-6 w-6 text-primary" /> Análise inteligente
        </h1>
        <p className="text-sm text-muted-foreground">
          Leitura automática dos dados reais do sistema, comparando o período atual com o anterior.
        </p>
      </div>

      <AtalhosPeriodo />
      <FiltrosBar registros={registros} />

      {insights.length === 0 ? (
        <p className="surface-panel rounded-2xl p-6 text-sm text-muted-foreground">
          Nenhuma variação relevante detectada com os dados e filtros atuais.
        </p>
      ) : (
        <div className="space-y-4">
          {[
            ["Pontos críticos", criticos],
            ["Pontos de atenção", atencao],
            ["Destaques positivos", positivos],
          ].map(([titulo, lista]) => {
            const itens = lista as Insight[];
            if (itens.length === 0) return null;
            return (
              <section key={titulo as string} className="surface-panel rounded-2xl p-4">
                <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {titulo as string} ({itens.length})
                </h2>
                <ul className="grid gap-2 md:grid-cols-2">
                  {itens.map((i) => (
                    <CartaoInsight key={i.id} insight={i} nomes={nomes} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
