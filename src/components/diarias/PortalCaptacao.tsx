import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, CalendarDays, ChevronLeft, HandHeart, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import logoLockup from "@/assets/recruta-lockup.png.asset.json";
import { RecruitaNetworkAnimation, type RecruitaAnimationState } from "@/components/RecruitaNetworkAnimation";
import { FormularioDiariasPublico } from "@/components/diarias/FormularioDiariasPublico";
import {
  CandidaturaOportunidade,
  type OportunidadePublica,
} from "@/components/diarias/CandidaturaOportunidade";
import { portalCaptacaoPublico } from "@/lib/captacao.functions";
import { FRASE_INSTITUCIONAL, MODALIDADE_DESCRICAO, MODALIDADE_ROTULO, resumoOportunidade } from "@/lib/captacao";

type Modalidade = "diarias" | "especifica" | "clt";

const ICONE: Record<Modalidade, typeof HandHeart> = {
  diarias: HandHeart,
  especifica: Sparkles,
  clt: Briefcase,
};

/**
 * Portal público de captação. A empresa vem exclusivamente do identificador
 * público do link e é sempre validada no banco (o slug não autoriza nada).
 */
export function PortalCaptacao({ slug }: { slug: string }) {
  const slugEmpresa = (slug ?? "").trim().toLowerCase();
  const {
    data: portal,
    isPending: carregando,
    isError: falhou,
    refetch: recarregar,
    isFetching: buscando,
  } = useQuery({
    queryKey: ["portal-captacao", slugEmpresa],
    queryFn: () => (slugEmpresa ? portalCaptacaoPublico({ data: { slug: slugEmpresa } }) : null),
    enabled: Boolean(slugEmpresa),
    retry: 2,
    staleTime: 60_000,
  });

  const [modalidade, setModalidade] = useState<Modalidade | null>(null);
  const [oportunidade, setOportunidade] = useState<OportunidadePublica | null>(null);
  const [estadoFormulario, setEstadoFormulario] = useState<RecruitaAnimationState>("idle");
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  const empresa = portal?.empresa ?? null;
  const linkIndisponivel = !slugEmpresa || (!carregando && !falhou && !portal);
  const falhaCarregamento = Boolean(slugEmpresa) && falhou;

  const disponiveis: Modalidade[] = portal
    ? ([
        portal.modalidades.diarias ? "diarias" : null,
        portal.modalidades.oportunidades ? "especifica" : null,
        portal.modalidades.clt ? "clt" : null,
      ].filter(Boolean) as Modalidade[])
    : [];

  const estadoAnimacao: RecruitaAnimationState = concluido
    ? "success"
    : enviando || carregando
      ? "loading"
      : estadoFormulario;

  const lista = (portal?.oportunidades ?? []) as unknown as OportunidadePublica[];
  const listaModalidade = lista.filter((o) =>
    modalidade === "clt" ? o.modalidade === "clt" : o.modalidade === "especifica",
  );

  return (
    <div className="malha-escura min-h-screen px-4 py-8 sm:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-3 flex justify-center">
          <span className="inline-flex items-center justify-center rounded-2xl border border-gold/25 bg-[#0b0f19] px-6 py-3 shadow-lg">
            <img src={logoLockup.url} alt="Recruta+" className="h-10 w-auto object-contain sm:h-12" />
          </span>
        </div>
        <p className="mb-6 text-center font-display text-sm tracking-wide text-gold sm:text-base">
          {FRASE_INSTITUCIONAL}
        </p>

        <h1 className="mb-5 text-center font-display text-2xl font-bold tracking-tight text-sidebar-foreground sm:text-3xl">
          {empresa ? `Encontre sua próxima oportunidade na ${empresa.nome}` : "Encontre sua próxima oportunidade"}
        </h1>
        <RecruitaNetworkAnimation state={estadoAnimacao} compact className="mb-6" />

        {carregando && slugEmpresa && (
          <p className="mb-6 flex items-center justify-center gap-2 rounded-lg border border-sidebar-border p-4 text-center text-sm text-sidebar-foreground/70">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando as oportunidades...
          </p>
        )}
        {falhaCarregamento && (
          <div className="mb-6 space-y-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-center text-sm text-sidebar-foreground">
            <p>Não conseguimos carregar os dados da empresa agora. Verifique sua conexão e tente novamente.</p>
            <Button variant="outline" size="sm" disabled={buscando} onClick={() => void recarregar()}>
              {buscando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tentar novamente
            </Button>
          </div>
        )}
        {linkIndisponivel && (
          <p className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-center text-sm text-destructive-foreground">
            Este cadastro não está disponível no momento. Verifique o link recebido ou peça o endereço
            correto de cadastro para a equipe.
          </p>
        )}

        {linkIndisponivel || falhaCarregamento || carregando || !empresa ? null : disponiveis.length === 0 ? (
          <p className="rounded-lg border border-sidebar-border p-5 text-center text-sm text-sidebar-foreground/70">
            No momento não há oportunidades abertas para cadastro. Volte em breve.
          </p>
        ) : modalidade === null ? (
          <div className="grid gap-3">
            {disponiveis.map((m) => {
              const Icone = ICONE[m];
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModalidade(m)}
                  className="flex min-h-[76px] w-full items-center gap-4 rounded-2xl border border-[color-mix(in_oklab,var(--color-gold)_26%,transparent)] bg-[color-mix(in_oklab,var(--color-sidebar)_45%,transparent)] px-4 py-4 text-left backdrop-blur-md transition-colors hover:bg-white/5"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-gold/25 bg-gold-soft text-accent-foreground">
                    <Icone className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold tracking-wide text-sidebar-foreground">
                      {MODALIDADE_ROTULO[m]}
                    </span>
                    <span className="block text-xs text-sidebar-foreground/65">
                      {MODALIDADE_DESCRICAO[m]}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {disponiveis.length > 1 && !oportunidade && (
              <Button
                variant="ghost"
                className="h-10 px-2 text-sidebar-foreground/70"
                onClick={() => setModalidade(null)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Ver todas as modalidades
              </Button>
            )}

            {modalidade === "diarias" && (
              <FormularioDiariasPublico
                tenantId={empresa.id}
                onEstado={setEstadoFormulario}
                onEnvio={(env, fim) => {
                  setEnviando(env);
                  setConcluido(fim);
                }}
              />
            )}

            {modalidade !== "diarias" &&
              (oportunidade ? (
                <CandidaturaOportunidade
                  slug={slugEmpresa}
                  oportunidade={oportunidade}
                  onVoltar={() => setOportunidade(null)}
                />
              ) : listaModalidade.length === 0 ? (
                <p className="rounded-lg border border-sidebar-border p-5 text-center text-sm text-sidebar-foreground/70">
                  Nenhuma oportunidade aberta nesta modalidade no momento.
                </p>
              ) : (
                <div className="grid gap-3">
                  {listaModalidade.map((o) => (
                    <Card
                      key={o.id}
                      className="border-[color-mix(in_oklab,var(--color-gold)_26%,transparent)] bg-[color-mix(in_oklab,var(--color-sidebar)_45%,transparent)] text-sidebar-foreground shadow-none backdrop-blur-md"
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base leading-snug">{o.titulo}</CardTitle>
                        <CardDescription className="flex items-center gap-1.5 text-sidebar-foreground/65">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {o.data_oportunidade
                            ? new Date(`${o.data_oportunidade}T12:00:00`).toLocaleDateString("pt-BR")
                            : "Vaga efetiva"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {resumoOportunidade(o).length > 0 && (
                          <div className="space-y-1 text-sm text-sidebar-foreground/80">
                            {resumoOportunidade(o).map((linha) => (
                              <p key={linha}>{linha}</p>
                            ))}
                          </div>
                        )}
                        {o.descricao && (
                          <p className="whitespace-pre-line text-sm text-sidebar-foreground/80">
                            {o.descricao}
                          </p>
                        )}
                        {o.requisitos && (
                          <div className="rounded-xl border border-sidebar-border/60 p-3">
                            <p className="mb-1 text-xs font-semibold uppercase text-sidebar-foreground/70">
                              Requisitos
                            </p>
                            <p className="whitespace-pre-line text-sm text-sidebar-foreground/80">
                              {o.requisitos}
                            </p>
                          </div>
                        )}
                        {o.informacoes_adicionais && (
                          <p className="whitespace-pre-line text-xs text-sidebar-foreground/60">
                            {o.informacoes_adicionais}
                          </p>
                        )}
                        <Button className="h-12 w-full" onClick={() => setOportunidade(o)}>
                          Quero me cadastrar
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
