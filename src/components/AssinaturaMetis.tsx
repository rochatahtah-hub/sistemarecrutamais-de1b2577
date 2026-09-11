/** Assinatura discreta, mas refinada, exibida no rodapé das telas. */
export function AssinaturaMetis() {
  return (
    <footer className="px-4 pb-8 pt-6 text-center">
      <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
        <span className="h-px w-10 bg-primary/40" aria-hidden="true" />
        <p className="font-serif text-[13px] font-light italic tracking-wide text-foreground/80 transition-colors hover:text-foreground">
          Desenvolvido por <span className="font-normal not-italic">Metis</span>
        </p>
      </div>
    </footer>
  );
}
