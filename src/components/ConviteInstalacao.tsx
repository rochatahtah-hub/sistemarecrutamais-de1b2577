import { Download, Loader2, Share, SquarePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useInstalacaoPwa } from "@/lib/pwa";

/**
 * Convite para adicionar o Recruta+ à tela inicial. Só aparece quando o
 * aparelho realmente suporta e quando o usuário não recusou há pouco tempo —
 * "Agora não" silencia o convite por duas semanas, sem bloquear nada do app.
 */
export function ConviteInstalacao() {
  const { convidando, plataforma, instalando, instalar, agoraNao } = useInstalacaoPwa();

  if (!convidando) return null;

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && agoraNao()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Instale o Recruta+</DialogTitle>
          <DialogDescription>
            Adicione o R+ à tela inicial para acessar o sistema com mais rapidez e praticidade.
          </DialogDescription>
        </DialogHeader>

        {plataforma === "ios" && (
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="font-semibold text-foreground">1.</span>
              <span className="flex items-center gap-1.5">
                Toque em <Share className="h-4 w-4 shrink-0" /> <strong>Compartilhar</strong> na
                barra do Safari.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-foreground">2.</span>
              <span className="flex items-center gap-1.5">
                Escolha <SquarePlus className="h-4 w-4 shrink-0" />{" "}
                <strong>Adicionar à Tela de Início</strong>.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-foreground">3.</span>
              <span>
                Confirme em <strong>Adicionar</strong>. O R+ aparece junto dos seus outros
                aplicativos.
              </span>
            </li>
          </ol>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={agoraNao}>
            Agora não
          </Button>
          {plataforma === "nativa" && (
            <Button onClick={instalar} disabled={instalando}>
              {instalando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Sim, adicionar
            </Button>
          )}
          {plataforma === "ios" && <Button onClick={agoraNao}>Entendi</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
