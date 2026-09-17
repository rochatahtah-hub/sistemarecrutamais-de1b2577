import { describe, expect, it } from "vitest";
import {
  consolidarQuinzena,
  periodoQuinzena,
  quinzenaDaData,
  rankingsQuinzena,
  ultimoDiaDoMes,
  type LinhaDiariaDoProgramador,
} from "./levantamento-quinzena";

function linha(
  p: Partial<LinhaDiariaDoProgramador> & { dataReferencia: string },
): LinhaDiariaDoProgramador {
  return {
    programadoraId: "prog-1",
    nome: "Ana",
    vagas: 1,
    pendentes: 0,
    presencas: 1,
    faltas: 0,
    cancelamentos: 0,
    ...p,
  };
}

describe("periodoQuinzena", () => {
  it("1ª quinzena vai do dia 1 ao 15", () => {
    expect(periodoQuinzena(2026, 9, 1)).toEqual({ inicio: "2026-09-01", fim: "2026-09-15" });
  });

  it("2ª quinzena de mês com 30 dias termina no dia 30", () => {
    expect(periodoQuinzena(2026, 9, 2)).toEqual({ inicio: "2026-09-16", fim: "2026-09-30" });
  });

  it("2ª quinzena de mês com 31 dias termina no dia 31", () => {
    expect(periodoQuinzena(2026, 1, 2)).toEqual({ inicio: "2026-01-16", fim: "2026-01-31" });
  });

  it("fevereiro de ano comum termina no dia 28", () => {
    expect(periodoQuinzena(2026, 2, 2)).toEqual({ inicio: "2026-02-16", fim: "2026-02-28" });
    expect(ultimoDiaDoMes(2026, 2)).toBe(28);
  });

  it("fevereiro de ano bissexto termina no dia 29", () => {
    expect(periodoQuinzena(2028, 2, 2)).toEqual({ inicio: "2028-02-16", fim: "2028-02-29" });
    expect(ultimoDiaDoMes(2028, 2)).toBe(29);
  });

  it("identifica a quinzena de uma data", () => {
    expect(quinzenaDaData("2026-09-15")).toBe(1);
    expect(quinzenaDaData("2026-09-16")).toBe(2);
  });
});

describe("consolidarQuinzena", () => {
  const periodo = periodoQuinzena(2026, 9, 1);

  it("período sem nenhum levantamento gera consolidação zerada, sem erro", () => {
    const r = consolidarQuinzena([], periodo);
    expect(r.totais.vagas).toBe(0);
    expect(r.totais.pctPresenca).toBe(0);
    expect(r.porProgramador).toEqual([]);
    expect(r.diasComDados).toEqual([]);
  });

  it("total da quinzena é exatamente a soma dos levantamentos diários", () => {
    const linhas = [
      linha({ dataReferencia: "2026-09-01", vagas: 12, presencas: 10, faltas: 2 }),
      linha({ dataReferencia: "2026-09-02", vagas: 8, presencas: 6, faltas: 1, cancelamentos: 1 }),
      linha({ dataReferencia: "2026-09-03", vagas: 15, presencas: 15 }),
    ];
    const r = consolidarQuinzena(linhas, periodo);
    expect(r.totais.vagas).toBe(35);
    expect(r.totais.presencas).toBe(31);
    expect(r.totais.faltas).toBe(3);
    expect(r.totais.cancelamentos).toBe(1);
  });

  it("recalcula o percentual pela fórmula do diário, nunca pela média dos dias", () => {
    // dia 1: 1 presença em 1 confirmada = 100%. dia 2: 1 presença em 3 = 33,3%.
    // A média simples daria 66,6%; o correto é 2/4 = 50%.
    const linhas = [
      linha({ dataReferencia: "2026-09-01", vagas: 1, presencas: 1 }),
      linha({ dataReferencia: "2026-09-02", vagas: 3, presencas: 1, faltas: 2 }),
    ];
    const r = consolidarQuinzena(linhas, periodo);
    expect(r.totais.pctPresenca).toBe(50);
  });

  it("vagas aguardando entram no total mas ficam fora do denominador", () => {
    const linhas = [linha({ dataReferencia: "2026-09-01", vagas: 3, presencas: 2, pendentes: 1 })];
    const r = consolidarQuinzena(linhas, periodo);
    expect(r.totais.vagas).toBe(3);
    expect(r.totais.pendentes).toBe(1);
    expect(r.totais.pctPresenca).toBe(100);
  });

  it("programador sem vaga no período nunca aparece", () => {
    const linhas = [
      linha({
        dataReferencia: "2026-09-01",
        programadoraId: "prog-1",
        nome: "Ana",
        vagas: 2,
        presencas: 2,
      }),
      linha({
        dataReferencia: "2026-09-02",
        programadoraId: "prog-2",
        nome: "Bruna",
        vagas: 0,
        presencas: 0,
      }),
    ];
    const r = consolidarQuinzena(linhas, periodo);
    expect(r.porProgramador).toHaveLength(1);
    expect(r.porProgramador[0]?.programadoraId).toBe("prog-1");
  });

  it("detalha por dia, em ordem, somente os dias com dado", () => {
    const linhas = [
      linha({ dataReferencia: "2026-09-03", vagas: 15, presencas: 15 }),
      linha({ dataReferencia: "2026-09-01", vagas: 12, presencas: 12 }),
    ];
    const r = consolidarQuinzena(linhas, periodo);
    const p = r.porProgramador[0]!;
    expect(p.dias.map((d) => d.data)).toEqual(["2026-09-01", "2026-09-03"]);
    expect(p.dias.reduce((s, d) => s + d.vagas, 0)).toBe(p.vagas);
  });
});

describe("rankingsQuinzena", () => {
  it("ordena os 4 rankings de forma ascendente", () => {
    const periodo = periodoQuinzena(2026, 9, 1);
    const r = consolidarQuinzena(
      [
        linha({
          dataReferencia: "2026-09-01",
          programadoraId: "a",
          nome: "A",
          vagas: 5,
          presencas: 5,
        }),
        linha({
          dataReferencia: "2026-09-01",
          programadoraId: "b",
          nome: "B",
          vagas: 2,
          presencas: 1,
          faltas: 1,
        }),
      ],
      periodo,
    );
    const rk = rankingsQuinzena(r.porProgramador);
    expect(rk.vagas.map((l) => l.programadoraId)).toEqual(["b", "a"]);
    expect(rk.pctPresenca.map((l) => l.programadoraId)).toEqual(["b", "a"]);
  });
});
