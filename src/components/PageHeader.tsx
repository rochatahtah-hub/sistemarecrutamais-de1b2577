import type { ReactNode } from "react";

/** Cabeçalho de página responsivo: título e ações sem quebrar em telas pequenas. */
export function PageHeader({
  titulo,
  descricao,
  icone,
  acoes,
}: {
  titulo: string;
  descricao?: string;
  icone?: ReactNode;
  acoes?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border/70 pb-5 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3.5">
        {icone && (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-gold/25 bg-gold-soft text-accent-foreground">
            {icone}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-[22px] font-semibold tracking-tight sm:text-[30px]">
            {titulo}
          </h1>
          {descricao && (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{descricao}</p>
          )}
        </div>
      </div>
      {acoes && <div className="flex shrink-0 flex-wrap items-center gap-2">{acoes}</div>}
    </header>
  );
}
