import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CalendarDays } from "lucide-react";
import logo from "@/assets/recruta-lockup.png.asset.json";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CandidaturaOportunidade } from "./CandidaturaOportunidade";
import { vagaPublicaQuery, vagasPublicasQuery } from "@/lib/oportunidades-query";
import { resumoOportunidade } from "@/lib/captacao";
import type { ReactNode } from "react";

function Moldura({ children }: { children: ReactNode }) {
  return <div className="malha-escura min-h-screen px-4 py-8 pb-24 text-sidebar-foreground">
    <main className="mx-auto max-w-3xl space-y-6">
      <img src={logo.url} alt="RECRUTA+" className="mx-auto h-12 w-auto object-contain" />
      {children}
    </main>
  </div>;
}

export function ListaVagasPublicas({ slug }: { slug: string }) {
  const { data: portal } = useSuspenseQuery(vagasPublicasQuery(slug));
  return <Moldura>
    <header className="space-y-2"><h1 className="font-display text-3xl font-bold">Vagas disponíveis</h1>
      {portal && <p className="text-sidebar-foreground/70">{portal.empresa.nome}</p>}
    </header>
    {!portal || portal.oportunidades.length === 0 ? <p role="status">Nenhuma vaga publicada e disponível no momento.</p> :
      <div className="grid gap-4 sm:grid-cols-2">{portal.oportunidades.map(o => <Card key={o.id} className="border-sidebar-border bg-sidebar text-sidebar-foreground shadow-none">
        <CardHeader className="space-y-3">
          <Badge variant="outline" className="w-fit">{o.modalidade === "clt" ? "VAGA CLT" : o.tipo_diaria === "avulsa" ? "DIÁRIA AVULSA" : "DIÁRIA SELECIONADA"}</Badge>
          <CardTitle className="text-lg leading-snug">{o.titulo}</CardTitle>
          {o.data_oportunidade && <p className="flex items-center gap-2 text-sm text-sidebar-foreground/70"><CalendarDays className="h-4 w-4" />{new Date(`${o.data_oportunidade}T12:00:00`).toLocaleDateString("pt-BR")}</p>}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1 text-sm text-sidebar-foreground/80">{resumoOportunidade(o).map(l => <p key={l}>{l}</p>)}</div>
          <Button asChild className="w-full"><Link to="/oportunidade/$slug/$id" params={{ slug, id: o.id }}>Ver vaga e cadastrar<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </CardContent>
      </Card>)}</div>}
    {portal?.modalidades.diarias && <Button asChild variant="outline"><Link to="/cadastro-diarias/$slug" params={{ slug }}>Cadastro geral para diárias</Link></Button>}
  </Moldura>;
}

export function VagaPublica({ slug, id }: { slug: string; id: string }) {
  const { data } = useSuspenseQuery(vagaPublicaQuery(slug, id));
  return <Moldura>
    <Button variant="ghost" asChild><Link to="/oportunidades/$slug" params={{ slug }}><ArrowLeft className="mr-2 h-4 w-4" />Todas as vagas</Link></Button>
    {data.oportunidade ? <>
      <header><h1 className="font-display text-2xl font-bold">{data.oportunidade.titulo}</h1><p className="mt-2 text-sidebar-foreground/70">{data.empresa?.nome}</p></header>
      <CandidaturaComRetorno slug={slug} oportunidade={data.oportunidade} />
    </> : <section className="space-y-3 py-8"><h1 className="font-display text-2xl font-bold">Vaga indisponível</h1><p role="status">{data.motivo}</p></section>}
  </Moldura>;
}

import { useNavigate } from "@tanstack/react-router";
import type { OportunidadePublica } from "./CandidaturaOportunidade";
function CandidaturaComRetorno({ slug, oportunidade }: { slug: string; oportunidade: OportunidadePublica }) {
  const navigate = useNavigate();
  return <CandidaturaOportunidade key={oportunidade.id} slug={slug} oportunidade={oportunidade}
    onVoltar={() => void navigate({ to: "/oportunidades/$slug", params: { slug } })} />;
}