import { CalendarRange } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFiltros } from "@/lib/filtros";
import { intervaloDoAtalho, ROTULO_ATALHO, type AtalhoPeriodo } from "@/lib/periodos";

const ATALHOS: AtalhoPeriodo[] = [
  "hoje",
  "ontem",
  "semana",
  "mes",
  "quinzena1",
  "quinzena2",
  "tudo",
];

/** Barra compacta de período: atalhos rápidos + intervalo personalizado. */
export function AtalhosPeriodo() {
  const { filtros, setFiltros } = useFiltros();

  const aplicar = (atalho: AtalhoPeriodo) => {
    setFiltros({
      ...intervaloDoAtalho(atalho),
      mes: "todos",
      ano: "todos",
      quinzena: "todas",
    });
  };

  const ativo = (atalho: AtalhoPeriodo) => {
    const alvo = intervaloDoAtalho(atalho);
    return filtros.dataInicio === alvo.dataInicio && filtros.dataFim === alvo.dataFim;
  };

  return (
    <div className="surface-panel flex flex-wrap items-end gap-3 rounded-2xl p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <CalendarRange className="mr-1 h-4 w-4 text-primary" />
        {ATALHOS.map((a) => (
          <Button
            key={a}
            size="sm"
            variant={ativo(a) ? "default" : "outline"}
            onClick={() => aplicar(a)}
          >
            {ROTULO_ATALHO[a]}
          </Button>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <div>
          <Label className="mb-1 block text-[11px] text-muted-foreground">De</Label>
          <Input
            type="date"
            className="h-9 w-[9.5rem]"
            value={filtros.dataInicio}
            onChange={(e) => setFiltros({ dataInicio: e.target.value })}
          />
        </div>
        <div>
          <Label className="mb-1 block text-[11px] text-muted-foreground">Até</Label>
          <Input
            type="date"
            className="h-9 w-[9.5rem]"
            value={filtros.dataFim}
            onChange={(e) => setFiltros({ dataFim: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}