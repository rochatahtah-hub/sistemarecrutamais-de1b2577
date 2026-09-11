import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, LockKeyhole, Sparkles, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listarPlanosPublicos } from "@/lib/comercial.functions";
import logoLockup from "@/assets/recruta-lockup.png.asset.json";

export const Route = createFileRoute("/leads")({
  head: () => ({ meta: [
    { title: "RECRUTA+ | Gestão de recrutamento para empresas" },
    { name: "description", content: "Conheça os planos do RECRUTA+ para organizar vagas, pessoas, pagamentos e resultados da sua empresa." },
    { property: "og:title", content: "RECRUTA+ | Recrutamento organizado e inteligente" },
    { property: "og:description", content: "Planos para novas empresas centralizarem recrutamento, operação e resultados." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    { name: "robots", content: "index, follow" },
  ], links: [{ rel: "canonical", href: "/leads" }] }),
  component: PaginaLeads,
});

function moeda(valor: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor / 100); }

function PaginaLeads() {
  const { data: planos = [], isPending } = useQuery({ queryKey: ["planos-publicos"], queryFn: () => listarPlanosPublicos() });
  const destaques = [
    { Icone: UsersRound, titulo: "Pessoas e vagas", texto: "Cadastros e operação reunidos em um só lugar." },
    { Icone: Sparkles, titulo: "Decisões claras", texto: "Indicadores e histórico para acompanhar resultados." },
    { Icone: LockKeyhole, titulo: "Dados separados", texto: "Cada empresa acessa somente sua própria operação." },
  ];
  return <div className="min-h-screen bg-background">
    <header className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><img src={logoLockup.url} alt="RECRUTA+" className="h-10 w-auto" /><Button asChild variant="subtle"><Link to="/acesso">Acessar sistema</Link></Button></div></header>
    <main><section className="malha-escura overflow-hidden text-sidebar-foreground"><div className="mx-auto grid min-h-[72vh] max-w-6xl content-center gap-10 px-5 py-16 lg:grid-cols-[1.1fr_.9fr] lg:py-24">
      <div><p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-sidebar-primary">Plataforma para novas empresas</p><h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">Recrutamento organizado do cadastro ao resultado.</h1><p className="mt-6 max-w-2xl text-base leading-7 text-sidebar-foreground/70 sm:text-lg">Centralize vagas, equipes, confirmações, pagamentos e indicadores com segurança e separação total entre empresas.</p><div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg" variant="gold"><a href="#planos">Conhecer planos <ArrowRight /></a></Button><Button asChild size="lg" variant="outline"><Link to="/acesso">Já sou cliente</Link></Button></div></div>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">{destaques.map(({ Icone, titulo, texto }) => <article key={titulo} className="border-l-2 border-sidebar-primary/60 bg-sidebar-accent/55 p-5"><Icone className="mb-3 h-5 w-5 text-sidebar-primary" /><h2 className="text-lg">{titulo}</h2><p className="mt-1 text-sm leading-6 text-sidebar-foreground/65">{texto}</p></article>)}</div>
    </div></section>
    <section id="planos" className="mx-auto max-w-6xl px-5 py-16 sm:py-20"><div className="max-w-2xl"><p className="rotulo-secao">Planos mensais</p><h2 className="mt-3 text-3xl">Escolha a estrutura ideal para sua operação</h2><p className="mt-3 text-muted-foreground">Preços e recursos são mantidos pela equipe RECRUTA+ e sempre confirmados no pagamento.</p></div>
      {isPending ? <p className="mt-10 text-muted-foreground">Carregando planos...</p> : planos.length === 0 ? <div className="mt-10 border-y border-border py-8"><h3 className="text-xl">Planos em preparação</h3><p className="mt-2 text-muted-foreground">Nossa equipe está finalizando as opções comerciais. O acesso de clientes atuais continua disponível normalmente.</p></div> : <div className="mt-10 grid gap-5 md:grid-cols-3">{planos.map((plano) => { const recursos = Array.isArray(plano.recursos) ? plano.recursos.filter((r): r is string => typeof r === "string") : []; return <article key={plano.id} className="surface-panel flex flex-col rounded-lg p-6"><p className="rotulo-secao">{plano.nome}</p><h3 className="mt-4 text-3xl">{moeda(plano.preco_mensal_centavos)}<span className="text-sm font-normal text-muted-foreground">/mês</span></h3><p className="mt-3 min-h-12 text-sm text-muted-foreground">{plano.descricao}</p><ul className="my-6 space-y-3">{recursos.map((r) => <li key={r} className="flex gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 text-gold" />{r}</li>)}</ul><Button asChild className="mt-auto"><Link to="/contratar" search={{ plano: plano.id }}>Escolher {plano.nome}</Link></Button></article>; })}</div>}
    </section></main>
  </div>;
}