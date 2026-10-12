interface AssinaturaMetisProps {
  /** "public" exibe a assinatura fixa e visível; "app" deixa discreta no final da página. */
  variant?: "public" | "app";
}

/** Assinatura refinada do RECRUTA+. */
export function AssinaturaMetis({ variant = "app" }: AssinaturaMetisProps) {
  if (variant === "app") {
    return (
      <footer className="px-4 pb-6 pt-8 text-center opacity-40 transition-opacity duration-300 hover:opacity-70">
        <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
          <span className="h-px w-10 bg-gold/40" aria-hidden="true" />
          <p className="cursor-default whitespace-nowrap font-serif text-[12px] font-light italic leading-snug tracking-wide text-gold/70">
            Desenvolvido por <span className="font-normal not-italic tracking-widest">Metis</span>
          </p>
        </div>
      </footer>
    );
  }

  // Era uma pílula com fundo, borda e sombra flutuando no meio da base da tela:
  // ficava por cima do conteúdo e atrapalhava a leitura. Virou uma linha fina e
  // apagada encostada no rodapé, com pointer-events-none para nunca roubar um
  // toque de algo que esteja embaixo.
  return (
    <footer
      className="pointer-events-none fixed inset-x-0 bottom-1.5 z-10 text-center"
      aria-label="Assinatura Metis"
    >
      <p className="whitespace-nowrap font-serif text-[10px] font-light italic leading-none tracking-wide text-[#F5F5F2]/25">
        Desenvolvido por <span className="not-italic tracking-widest">Metis</span>
      </p>
    </footer>
  );
}
