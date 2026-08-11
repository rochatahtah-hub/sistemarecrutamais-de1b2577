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
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 pb-1 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {icone && (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-gold">
            {icone}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-[26px]">{titulo}</h1>
          {descricao && <p className="mt-0.5 text-sm text-muted-foreground">{descricao}</p>}
        </div>
      </div>
      {acoes && <div className="flex shrink-0 flex-wrap items-center gap-2">{acoes}</div>}
    </header>
  );
}
