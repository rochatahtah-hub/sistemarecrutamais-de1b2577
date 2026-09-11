/** Assinatura refinada e visível exibida no rodapé das telas. */
export function AssinaturaMetis() {
  return (
    <footer className="px-4 pb-8 pt-6 text-center">
      <div className="mx-auto flex max-w-xs flex-col items-center gap-2.5">
        <span className="h-px w-12 bg-gold/60" aria-hidden="true" />
        <p className="group cursor-default font-serif text-[14px] font-light italic leading-snug tracking-wide text-gold/85 transition-all duration-300 hover:text-gold">
          Desenvolvido por{" "}
          <span className="font-normal not-italic tracking-widest">Metis</span>
        </p>
      </div>
    </footer>
  );
}
