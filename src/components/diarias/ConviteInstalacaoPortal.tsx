import { useState } from "react";
import { Download, Loader2, Share, Smartphone, SquarePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useInstalacaoPwa } from "@/lib/pwa";

/**
 * Convite para o colaborador instalar o Recruta+ no celular, dentro do portal
 * público de cadastro.
 *
 * Diferente do convite da área interna, aqui é um cartão embutido na página —
 * não um modal. Quem abre esse link está tentando se candidatar a uma vaga;
 * uma janela por cima disso atrapalha o que a pessoa veio fazer. O cartão
 * aparece, pode ser dispensado e não volta a insistir por duas semanas.
 */
export function ConviteInstalacaoPortal() {
  const { convidando, plataforma, instalando, instalar, agoraNao } = useInstalacaoPwa();
  const [passosIos, setPassosIos] = useState(false);

  if (!convidando) return null;

  return (
    <div className="mb-6 rounded-xl border border-gold/25 bg-[#0b0f19] p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold/10 text-gold">
          <Smartphone className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold text-sidebar-foreground">
            Tenha o Recruta+ no seu celular
          </p>
          <p className="mt-1 text-xs leading-5 text-sidebar-foreground/70">
            Instale o aplicativo para acessar o portal com mais facilidade e acompanhar novas
            oportunidades.
          </p>

          {plataforma === "ios" && passosIos && (
            <ol className="mt-3 space-y-2 text-xs leading-5 text-sidebar-foreground/70">
              <li className="flex items-center gap-1.5">
                <span className="font-semibold text-sidebar-foreground">1.</span>
                Toque em <Share className="h-3.5 w-3.5 shrink-0" />
                <strong className="text-sidebar-foreground">Compartilhar</strong> na barra do
                Safari.
              </li>
              <li className="flex items-center gap-1.5">
                <span className="font-semibold text-sidebar-foreground">2.</span>
                Escolha <SquarePlus className="h-3.5 w-3.5 shrink-0" />
                <strong className="text-sidebar-foreground">Adicionar à Tela de Início</strong>.
              </li>
              <li className="flex gap-1.5">
                <span className="font-semibold text-sidebar-foreground">3.</span>
                <span>
                  Confirme em <strong className="text-sidebar-foreground">Adicionar</strong>.
                </span>
              </li>
            </ol>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {plataforma === "nativa" && (
              <Button size="sm" disabled={instalando} onClick={instalar}>
                {instalando ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="mr-2 h-3.5 w-3.5" />
                )}
                Instalar aplicativo
              </Button>
            )}
            {plataforma === "ios" && !passosIos && (
              <Button size="sm" onClick={() => setPassosIos(true)}>
                <Download className="mr-2 h-3.5 w-3.5" />
                Instalar aplicativo
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={agoraNao}>
              Agora não
            </Button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Fechar convite de instalação"
          onClick={agoraNao}
          className="shrink-0 rounded-md p-1 text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
