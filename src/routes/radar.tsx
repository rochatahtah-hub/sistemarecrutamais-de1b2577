import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Radar, ChevronDown } from "lucide-react";

import { AtalhosPeriodo } from "@/components/AtalhosPeriodo";
import { SemPlanilha } from "@/components/PlanilhaAtiva";
import { Button } from "@/components/ui/button";
import { useConfiguracoes, useVagas } from "@/lib/dados";
import { aplicarFiltros, useFiltros } from "@/lib/filtros";
import { gerarRadar, type AlertaRadar } from "@/lib/inteligencia";
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

function Pagina() {
  const { data: registros = [], isLoading } = useVagas();
  const { data: config } = useConfiguracoes();
  const { filtros, setFiltros } = useFiltros();
  const navigate = useNavigate();
  const [aberto, setAberto] = useState<string | null>(null);
  const metas = config?.metas ?? METAS_PADRAO;

  const alertas = useMemo(
    () => gerarRadar(aplicarFiltros(registros, filtros), metas),
    [registros, filtros, metas],
  );

  if (!isLoading && registros.length === 0) return <SemPlanilha pagina="O Radar da Operação" />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          <Radar className="h-6 w-6 text-primary" /> Radar da operação
        </h1>
        <p className="text-sm text-muted-foreground">
          Situações detectadas a partir dos registros reais do período filtrado.
        </p>
      </div>

      <AtalhosPeriodo />

      {alertas.length === 0 ? (
        <p className="surface-panel rounded-xl p-6 text-sm text-muted-foreground">
          Nenhuma situação de atenção detectada no período.
        </p>
      ) : (
        <ul className="space-y-2">
          {alertas.map((a) => (
            <li key={a.id} className={`rounded-xl border p-4 ${CORES[a.nivel].borda}`}>
              <button
                type="button"
                className="flex w-full items-start gap-3 text-left"
                onClick={() => setAberto(aberto === a.id ? null : a.id)}
              >
                <span className="text-lg leading-none">{CORES[a.nivel].ponto}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{a.titulo}</span>
                  <span className="block text-xs text-muted-foreground">{a.detalhe}</span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform ${aberto === a.id ? "rotate-180" : ""}`}
                />
              </button>
              {aberto === a.id && (
                <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {a.itens.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
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
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}