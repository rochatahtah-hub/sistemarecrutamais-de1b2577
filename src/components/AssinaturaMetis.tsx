/** Assinatura refinada e sempre visível, mas discreta, exibida no rodapé das telas. */
export function AssinaturaMetis() {
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
