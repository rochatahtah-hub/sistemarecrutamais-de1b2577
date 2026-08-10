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
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-4 py-10 text-center">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-muted text-muted-foreground">
        {icone ?? <Inbox className="h-6 w-6" />}
      </span>
      <div className="max-w-md space-y-1">
        <p className="font-display text-base font-semibold">{titulo}</p>
        {descricao && <p className="text-sm text-muted-foreground">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}
