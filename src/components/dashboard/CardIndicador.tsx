import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function CardIndicador({
  titulo,
  valor,
  detalhe,
  icon: Icon,
  tom = "neutro",
  onClick,
  destaque = false,
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  icon: LucideIcon;
  tom?: "ouro" | "positivo" | "negativo" | "neutro";
  onClick?: () => void;
  destaque?: boolean;
}) {
  const cores = {
    ouro: "text-primary",
    positivo: "text-success",
    negativo: "text-destructive",
    neutro: "text-foreground",
  } as const;

  const fundoIcone = {
    ouro: "bg-gold-soft text-accent-foreground",
    positivo: "bg-success/10 text-success",
    negativo: "bg-destructive/10 text-destructive",
    neutro: "bg-muted text-muted-foreground",
  } as const;

  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
          {titulo}
        </p>
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", fundoIcone[tom])}>
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
      </div>
      <p
        className={cn(
          "mt-4 font-semibold leading-none tracking-tight tabular-nums",
          destaque ? "text-[34px]" : "text-[26px]",
          cores[tom],
        )}
      >
        {valor}
      </p>
      {detalhe && <p className="mt-2.5 text-xs text-muted-foreground">{detalhe}</p>}
    </>
  );

  const base = cn(
    "surface-panel rounded-2xl p-5",
    destaque && "filete-ouro p-6",
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(base, "elevar-hover text-left")}
      >
        {conteudo}
      </button>
    );
  }

  return <div className={base}>{conteudo}</div>;
}