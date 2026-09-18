import { useMensagemDoDia } from "@/lib/mensagens-diarias";
import { textoParaExibir } from "@/lib/mensagem-do-dia";

/**
 * A frase que acompanha a saudação no Dashboard.
 *
 * Cada pessoa recebe a sua própria frase no dia — não é a mesma para a equipe
 * toda. Por isso ela aparece com peso: é um recado para quem está lendo, não
 * um aviso do sistema. Ainda assim fica menor que a saudação, que continua
 * sendo o elemento principal.
 *
 * Enquanto carrega, não mostra nada nem reserva espaço: melhor a frase surgir
 * do que a página dar um salto.
 */
export function MensagemDoDia() {
  const { data: mensagem } = useMensagemDoDia();
  if (!mensagem) return null;

  return (
    <p className="mt-2.5 max-w-2xl border-l-2 border-gold/50 pl-3 font-display text-[17px] italic leading-relaxed text-foreground/90 sm:text-lg">
      {textoParaExibir(mensagem)}
    </p>
  );
}
