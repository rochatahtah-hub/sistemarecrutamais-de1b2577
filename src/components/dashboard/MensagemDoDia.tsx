import { useMensagemDoDia } from "@/lib/mensagens-diarias";
import { textoParaExibir } from "@/lib/mensagem-do-dia";

/**
 * A frase que acompanha a saudação no Dashboard.
 *
 * Fica deliberadamente discreta: uma linha, menor que a saudação, sem card nem
 * moldura. A saudação continua sendo o elemento principal — isto é um detalhe
 * que aquece a tela, não um bloco disputando atenção com os indicadores.
 *
 * Enquanto carrega, não mostra nada nem reserva espaço: melhor a frase surgir
 * do que a página dar um salto.
 */
export function MensagemDoDia() {
  const { data: mensagem } = useMensagemDoDia();
  if (!mensagem) return null;

  return (
    <p className="mt-2 max-w-xl text-sm italic leading-relaxed text-muted-foreground">
      {textoParaExibir(mensagem)}
    </p>
  );
}
