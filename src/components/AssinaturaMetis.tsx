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
            Desenvolvido por{" "}
            <span className="font-normal not-italic tracking-widest">Metis</span>
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-gold/30 bg-[#0B101C]/90 px-5 py-2 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45)] backdrop-blur-sm transition-all duration-300 hover:border-gold/55 hover:bg-[#0B101C]/95 hover:shadow-[0_10px_28px_-4px_rgba(201,161,90,0.18)]"
      aria-label="Assinatura Metis"
    >
      <p className="cursor-default whitespace-nowrap font-serif text-[13px] font-light italic leading-snug tracking-wide text-[#F5F5F2]/90 transition-colors duration-300 hover:text-gold">
        Desenvolvido por{" "}
        <span className="font-normal not-italic tracking-widest text-gold">Metis</span>
      </p>
    </footer>
  );
}
