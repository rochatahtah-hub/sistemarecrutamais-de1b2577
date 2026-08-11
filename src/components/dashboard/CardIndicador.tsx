import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function CardIndicador({
  titulo,
  valor,
  detalhe,
  icon: Icon,
  tom = "neutro",
  onClick,
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  icon: LucideIcon;
  tom?: "ouro" | "positivo" | "negativo" | "neutro";
  onClick?: () => void;
}) {
  const cores = {
    ouro: "text-primary",
    positivo: "text-success",
    negativo: "text-destructive",
    neutro: "text-foreground",
  } as const;

  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {titulo}
        </p>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted">
          <Icon className={cn("h-4 w-4", cores[tom])} strokeWidth={1.75} />
        </span>
      </div>
      <p className={cn("mt-3 text-[28px] font-semibold leading-none tracking-tight", cores[tom])}>
        {valor}
      </p>
      {detalhe && <p className="mt-2 text-xs text-muted-foreground">{detalhe}</p>}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="surface-panel rounded-xl p-5 text-left hover:border-gold/50 hover:shadow-md"
      >
        {conteudo}
      </button>
    );
  }

  return <div className="surface-panel rounded-xl p-5">{conteudo}</div>;
}