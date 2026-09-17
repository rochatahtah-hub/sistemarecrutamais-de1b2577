import { describe, expect, it } from "vitest";
import {
  MENSAGEM_PADRAO,
  mensagemDoDia,
  textoParaExibir,
  type MensagemDiaria,
} from "./mensagem-do-dia";

function msg(id: string, extra: Partial<MensagemDiaria> = {}): MensagemDiaria {
  return {
    id,
    texto: `frase ${id}`,
    tipo: "motivacional",
    referencia: null,
    dataEspecifica: null,
    ...extra,
  };
}

describe("mensagemDoDia", () => {
  it("sem nenhuma mensagem cadastrada, cai na padrão em vez de quebrar", () => {
    expect(mensagemDoDia([], "2026-09-17")).toEqual(MENSAGEM_PADRAO);
  });

  it("a mesma data devolve sempre a mesma mensagem", () => {
    const lista = [msg("a"), msg("b"), msg("c")];
    const primeira = mensagemDoDia(lista, "2026-09-17");
    for (let i = 0; i < 20; i++) {
      expect(mensagemDoDia(lista, "2026-09-17").id).toBe(primeira.id);
    }
  });

  it("a ordem em que as mensagens chegam não muda a escolha", () => {
    const lista = [msg("a"), msg("b"), msg("c")];
    const invertida = [msg("c"), msg("b"), msg("a")];
    expect(mensagemDoDia(lista, "2026-09-17").id).toBe(mensagemDoDia(invertida, "2026-09-17").id);
  });

  it("dias seguidos nunca repetem a mensagem", () => {
    const lista = [msg("a"), msg("b"), msg("c"), msg("d")];
    const dias = [
      "2026-09-14",
      "2026-09-15",
      "2026-09-16",
      "2026-09-17",
      "2026-09-18",
      "2026-09-19",
    ];
    const escolhidas = dias.map((d) => mensagemDoDia(lista, d).id);
    for (let i = 1; i < escolhidas.length; i++) {
      expect(escolhidas[i]).not.toBe(escolhidas[i - 1]);
    }
  });

  it("com uma só mensagem cadastrada, ela se repete sem erro", () => {
    const lista = [msg("unica")];
    expect(mensagemDoDia(lista, "2026-09-17").id).toBe("unica");
    expect(mensagemDoDia(lista, "2026-09-18").id).toBe("unica");
  });

  it("passa por todas as mensagens ao longo do ciclo", () => {
    const lista = [msg("a"), msg("b"), msg("c")];
    const vistas = new Set<string>();
    for (let i = 1; i <= 9; i++) {
      vistas.add(mensagemDoDia(lista, `2026-09-${String(i).padStart(2, "0")}`).id);
    }
    expect(vistas.size).toBe(3);
  });

  it("mensagem marcada para uma data tem prioridade naquele dia", () => {
    const lista = [msg("a"), msg("b"), msg("natal", { dataEspecifica: "2026-12-25" })];
    expect(mensagemDoDia(lista, "2026-12-25").id).toBe("natal");
    // e não atrapalha os outros dias
    expect(mensagemDoDia(lista, "2026-12-24").id).not.toBe("natal");
  });

  it("mensagem de data específica fica fora do rodízio dos demais dias", () => {
    const lista = [msg("a"), msg("natal", { dataEspecifica: "2026-12-25" })];
    for (let i = 1; i <= 10; i++) {
      const escolhida = mensagemDoDia(lista, `2026-11-${String(i).padStart(2, "0")}`);
      expect(escolhida.id).toBe("a");
    }
  });

  it("vira o ano sem quebrar", () => {
    const lista = [msg("a"), msg("b")];
    expect(mensagemDoDia(lista, "2026-12-31").id).not.toBe(mensagemDoDia(lista, "2027-01-01").id);
  });
});

describe("textoParaExibir", () => {
  it("versículo sai com a referência", () => {
    const v = msg("v", {
      tipo: "versiculo",
      texto: "Seja forte e corajoso.",
      referencia: "Josué 1:9",
    });
    expect(textoParaExibir(v)).toBe("“Seja forte e corajoso.” — Josué 1:9");
  });

  it("frase comum sai limpa, sem aspas nem referência", () => {
    expect(textoParaExibir(msg("a", { texto: "Você é capaz." }))).toBe("Você é capaz.");
  });

  it("tipo versículo sem referência cadastrada não inventa pontuação", () => {
    const v = msg("v", { tipo: "versiculo", texto: "Tenha fé.", referencia: null });
    expect(textoParaExibir(v)).toBe("Tenha fé.");
  });
});
