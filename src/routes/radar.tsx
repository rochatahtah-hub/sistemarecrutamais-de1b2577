import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Radar, ChevronDown, CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { AtalhosPeriodo } from "@/components/AtalhosPeriodo";
import { SemPlanilha } from "@/components/PlanilhaAtiva";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useConfiguracoes, useVagas } from "@/lib/dados";
import { aplicarFiltros, useFiltros } from "@/lib/filtros";
import { gerarRadar, type AlertaRadar } from "@/lib/inteligencia";
import { usePrivacidade } from "@/lib/privacidade";
import {
  useAlertasSalvos,
  useDefinirStatusAlerta,
  useSincronizarAlertas,
} from "@/lib/alertas";
import { METAS_PADRAO } from "@/lib/tipos";

export const Route = createFileRoute("/radar")({
  head: () => ({
    meta: [
      { title: "Radar da Operação | RECRUTA+" },
      {
        name: "description",
        content:
          "Detecção automática de situações que precisam de atenção na operação de recrutamento.",
      },
      { property: "og:title", content: "Radar da Operação | RECRUTA+" },
      {
        property: "og:description",
        content: "Alertas reais de faltas elevadas, quedas de presença e vagas sem confirmação.",
      },
    ],
  }),
  component: Pagina,
});

const CORES: Record<AlertaRadar["nivel"], { ponto: string; borda: string }> = {
  vermelho: { ponto: "🔴", borda: "border-destructive/40 bg-destructive/10" },
  laranja: { ponto: "🟠", borda: "border-warning/40 bg-warning/10" },
  amarelo: { ponto: "🟡", borda: "border-primary/30 bg-primary/5" },
  verde: { ponto: "🟢", borda: "border-success/40 bg-success/10" },
};

type Aba = "pendentes" | "resolvidos" | "todos";

function Pagina() {
  const { data: registros = [], isLoading } = useVagas();
  const { data: config } = useConfiguracoes();
  const { perfil } = useAuth();
  const priv = usePrivacidade();
  const { filtros, setFiltros } = useFiltros();
  const navigate = useNavigate();
  const [aberto, setAberto] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("pendentes");
  const metas = config?.metas ?? METAS_PADRAO;

  const alertas = useMemo(
    () => gerarRadar(filtrar(registros), metas),
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

  const { data: salvos = [] } = useAlertasSalvos();
  const sincronizar = useSincronizarAlertas();
  const definirStatus = useDefinirStatusAlerta();
  const ultimaSincronia = useRef("");

  useEffect(() => {
    const assinatura = alertas.map((a) => `${a.id}:${a.titulo}`).join("|");
    if (!assinatura || assinatura === ultimaSincronia.current) return;
    ultimaSincronia.current = assinatura;
    sincronizar.mutate(alertas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertas]);

  const mapaSalvos = useMemo(() => new Map(salvos.map((s) => [s.chave, s])), [salvos]);
  const visiveis = alertas.filter((a) => {
    const status = mapaSalvos.get(a.id)?.status ?? "pendente";
    if (aba === "todos") return true;
    return aba === "pendentes" ? status !== "resolvido" : status === "resolvido";
  });
  const pendentes = alertas.filter(
    (a) => (mapaSalvos.get(a.id)?.status ?? "pendente") !== "resolvido",
  ).length;

  async function alterar(chave: string, status: "pendente" | "resolvido") {
    try {
      await definirStatus.mutateAsync({ chave, status, nome: perfil?.nome ?? "usuário" });
      toast.success(status === "resolvido" ? "Alerta marcado como resolvido." : "Alerta reaberto.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (!isLoading && registros.length === 0) return <SemPlanilha pagina="O Radar da Operação" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          <Radar className="h-6 w-6 text-primary" /> Radar da operação
        </h1>
        <p className="text-sm text-muted-foreground">
          {pendentes} alerta(s) pendente(s) de {alertas.length} detectado(s) no período filtrado.
        </p>
      </div>

      <AtalhosPeriodo />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["pendentes", "Pendentes"],
            ["resolvidos", "Resolvidos"],
            ["todos", "Todos"],
          ] as const
        ).map(([valor, rotulo]) => (
          <Button
            key={valor}
            size="sm"
            variant={aba === valor ? "default" : "outline"}
            onClick={() => setAba(valor)}
          >
            {rotulo}
          </Button>
        ))}
      </div>

      {visiveis.length === 0 ? (
        <p className="surface-panel rounded-2xl p-6 text-sm text-muted-foreground">
          {aba === "resolvidos"
            ? "Nenhum alerta resolvido até agora."
            : "Nenhuma situação de atenção pendente no período."}
        </p>
      ) : (
        <ul className="space-y-2">
          {visiveis.map((a) => {
            const salvo = mapaSalvos.get(a.id);
            const resolvido = salvo?.status === "resolvido";
            return (
              <li key={a.id} className={`rounded-xl border p-4 ${CORES[a.nivel].borda}`}>
                <button
                  type="button"
                  className="flex w-full items-start gap-3 text-left"
                  onClick={() => setAberto(aberto === a.id ? null : a.id)}
                >
                  <span className="text-lg leading-none">{CORES[a.nivel].ponto}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{priv.frase(a.titulo, nomes)}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          resolvido
                            ? "bg-success/20 text-success"
                            : "bg-primary/15 text-primary"
                        }`}
                      >
                        {resolvido ? "Resolvido" : "Pendente"}
                      </span>
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {priv.frase(a.detalhe, nomes)}
                    </span>
                    {resolvido && salvo?.resolvido_em && (
                      <span className="block text-[11px] text-muted-foreground">
                        Resolvido por {salvo.resolvido_por_nome || "usuário"} em{" "}
                        {new Date(salvo.resolvido_em).toLocaleString("pt-BR")}
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform ${aberto === a.id ? "rotate-180" : ""}`}
                  />
                </button>
                {aberto === a.id && (
                  <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {a.itens.map((item) => (
                        <li key={item}>• {priv.frase(item, nomes)}</li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-2">
                      {a.filtro && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setFiltros(a.filtro!);
                            void navigate({ to: "/vagas" });
                          }}
                        >
                          Abrir registros
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={resolvido ? "outline" : "default"}
                        disabled={definirStatus.isPending}
                        onClick={() => void alterar(a.id, resolvido ? "pendente" : "resolvido")}
                      >
                        {resolvido ? (
                          <>
                            <RotateCcw className="mr-2 h-4 w-4" /> Reabrir alerta
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Marcar como resolvido
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
