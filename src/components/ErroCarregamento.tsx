import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { mensagemErro } from "@/lib/sincronizar";

interface Props {
  error?: unknown;
  onTentarNovamente?: () => void;
  titulo?: string;
}

/** Bloco amigável usado quando uma consulta falha (item 17). */
export function ErroCarregamento({ error, onTentarNovamente, titulo }: Props) {
  return (
    <div className="surface-panel flex flex-col items-center justify-center gap-3 p-6 text-center">
      <AlertTriangle className="h-6 w-6 text-destructive" />
      <div>
        <h3 className="font-display font-semibold">{titulo ?? "Falha ao carregar"}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{mensagemErro(error)}</p>
      </div>
      {onTentarNovamente ? (
        <Button type="button" variant="outline" size="sm" onClick={onTentarNovamente}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}
