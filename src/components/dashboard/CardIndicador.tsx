import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function CardIndicador({
  titulo,
  valor,
  detalhe,
  icon: Icon,
  tom = "neutro",
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  icon: LucideIcon;
  tom?: "ouro" | "positivo" | "negativo" | "neutro";
}) {
  const cores = {
    ouro: "text-primary",
    positivo: "text-success",
    negativo: "text-destructive",
    neutro: "text-foreground",
  } as const;

  return (
    <div className="surface-panel rounded-xl p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {titulo}
        </p>
        <Icon className={cn("h-4 w-4", cores[tom])} />
      </div>
      <p className={cn("mt-2 font-display text-3xl font-bold leading-none", cores[tom])}>{valor}</p>
      {detalhe && <p className="mt-1.5 text-xs text-muted-foreground">{detalhe}</p>}
    </div>
  );
}