import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

/** Estado vazio padronizado: explica o que falta e o próximo passo. */
export function EstadoVazio({
  titulo,
  descricao,
  icone,
  acao,
}: {
  titulo: string;
  descricao?: string;
  icone?: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/25 px-4 py-14 text-center">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-border bg-card text-muted-foreground shadow-[var(--elev-1)]">
        {icone ?? <Inbox className="h-6 w-6" strokeWidth={1.75} />}
      </span>
      <div className="max-w-md space-y-1">
        <p className="font-display text-lg font-semibold tracking-tight">{titulo}</p>
        {descricao && (
          <p className="text-sm leading-relaxed text-muted-foreground">{descricao}</p>
        )}
      </div>
      {acao}
    </div>
  );
}
