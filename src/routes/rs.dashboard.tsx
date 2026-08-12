import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/PageHeader";
import { EstadoVazio } from "@/components/EstadoVazio";
import { RequerPermissao } from "@/components/RequerPermissao";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FAIXAS_PERMANENCIA,
  diasDePermanencia,
  media,
  permanenciaTexto,
  useCandidatosCLT,
} from "@/lib/rs";

export const Route = createFileRoute("/rs/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard R&S CLT | Recruta+" },
      {
        name: "description",
        content:
          "Indicadores exclusivos do recrutamento e seleção CLT: admissões, desligamentos, ativos e tempo médio de permanência.",
      },
      { property: "og:title", content: "Dashboard R&S CLT | Recruta+" },
      {
        property: "og:description",
        content: "Painel de indicadores do módulo de Recrutamento e Seleção CLT.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaProtegida,
});

const CORES = ["#c9a227", "#1e3a8a", "#7c8798", "#0ea5e9", "#a16207", "#475569"];

function Indicador({ rotulo, valor }: { rotulo: string; valor: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{rotulo}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{valor}</p>
      </CardContent>
    </Card>
  );
}

function Pagina() {
  const { data: candidatos = [], isLoading } = useCandidatosCLT();

  const m = useMemo(() => {
    const ativos = candidatos.filter((c) => c.status === "ativo");
    const desligados = candidatos.filter((c) => c.status === "desligado");
    const dias = (lista: typeof candidatos) =>
      lista.map(diasDePermanencia).filter((d): d is number => d !== null);
    const todosDias = dias(candidatos);

    const porChave = (fn: (c: (typeof candidatos)[number]) => string) => {
      const mapa = new Map<string, { total: number; ativos: number; desligados: number; dias: number[] }>();
      for (const c of candidatos) {
        const chave = fn(c) || "Não informado";
        const at = mapa.get(chave) ?? { total: 0, ativos: 0, desligados: 0, dias: [] };
        at.total += 1;
        if (c.status === "ativo") at.ativos += 1;
        else at.desligados += 1;
        const d = diasDePermanencia(c);
        if (d !== null) at.dias.push(d);
        mapa.set(chave, at);
      }
      return [...mapa.entries()].map(([nome, v]) => ({
        nome,
        ...v,
        mediaDias: v.dias.length ? media(v.dias) : 0,
      }));
    };

    return {
      total: candidatos.length,
      ativos: ativos.length,
      desligados: desligados.length,
      admissoes: candidatos.filter((c) => c.data_admissao).length,
      mediaGeral: todosDias.length ? media(todosDias) : null,
      mediaAtivos: dias(ativos).length ? media(dias(ativos)) : null,
      mediaDesligados: dias(desligados).length ? media(dias(desligados)) : null,
      maior: todosDias.length ? Math.max(...todosDias) : null,
      menor: todosDias.length ? Math.min(...todosDias) : null,
      faixas: FAIXAS_PERMANENCIA.map((f) => ({
        nome: f.rotulo,
        total: todosDias.filter((d) => f.teste(d)).length,
      })),
      empresas: porChave((c) => c.rs_empresas?.nome ?? "").sort((a, b) => b.total - a.total),
      cargos: porChave((c) => c.cargo).sort((a, b) => b.total - a.total),
    };
  }, [candidatos]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando indicadores…</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Dashboard R&S"
        descricao="Indicadores exclusivos do recrutamento e seleção CLT."
        icone={<BarChart3 className="h-5 w-5" />}
      />

      {candidatos.length === 0 ? (
        <EstadoVazio
          titulo="Ainda não há dados de R&S CLT"
          descricao="Cadastre candidatos CLT em Meus Candidatos para que os indicadores sejam calculados."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Indicador rotulo="Candidatos CLT" valor={m.total} />
            <Indicador rotulo="Ativos" valor={m.ativos} />
            <Indicador rotulo="Desligados" valor={m.desligados} />
            <Indicador rotulo="Admissões" valor={m.admissoes} />
            <Indicador rotulo="Permanência média (geral)" valor={permanenciaTexto(m.mediaGeral)} />
            <Indicador rotulo="Média dos ativos" valor={permanenciaTexto(m.mediaAtivos)} />
            <Indicador rotulo="Média dos desligados" valor={permanenciaTexto(m.mediaDesligados)} />
            <Indicador rotulo="Maior permanência" valor={permanenciaTexto(m.maior)} />
            <Indicador rotulo="Menor permanência" valor={permanenciaTexto(m.menor)} />
            <Indicador rotulo="Empresas com candidatos" valor={m.empresas.length} />
            <Indicador rotulo="Cargos distintos" valor={m.cargos.length} />
            <Indicador rotulo="Desligamentos" valor={m.desligados} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Faixas de permanência</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={m.faixas}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="nome" fontSize={11} interval={0} angle={-15} textAnchor="end" height={60} />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="total" name="Candidatos" fill="#c9a227" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Ativos x Desligados</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { nome: "Ativos", valor: m.ativos },
                        { nome: "Desligados", valor: m.desligados },
                      ]}
                      dataKey="valor"
                      nameKey="nome"
                      outerRadius={95}
                      label
                    >
                      {CORES.slice(0, 2).map((cor) => (
                        <Cell key={cor} fill={cor} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Candidatos por empresa</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={m.empresas.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis type="number" allowDecimals={false} fontSize={11} />
                    <YAxis type="category" dataKey="nome" width={130} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="ativos" name="Ativos" stackId="a" fill="#1e3a8a" />
                    <Bar dataKey="desligados" name="Desligados" stackId="a" fill="#c9a227" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Candidatos por cargo</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={m.cargos.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis type="number" allowDecimals={false} fontSize={11} />
                    <YAxis type="category" dataKey="nome" width={130} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="total" name="Candidatos" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Ranking por empresa</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {m.empresas.slice(0, 10).map((e) => (
                  <div key={e.nome} className="flex items-center justify-between gap-3 border-b border-border/60 pb-1.5">
                    <span className="truncate font-medium">{e.nome}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {e.total} cand. · {e.ativos} ativos · {e.desligados} deslig. ·{" "}
                      {permanenciaTexto(e.mediaDias)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Ranking por cargo</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {m.cargos.slice(0, 10).map((c) => (
                  <div key={c.nome} className="flex items-center justify-between gap-3 border-b border-border/60 pb-1.5">
                    <span className="truncate font-medium">{c.nome}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {c.total} cand. · {c.ativos} ativos · {c.desligados} deslig. ·{" "}
                      {permanenciaTexto(c.mediaDias)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function PaginaProtegida() {
  return (
    <RequerPermissao modulo="rs_dashboard" area="Dashboard R&S">
      <Pagina />
    </RequerPermissao>
  );
}
