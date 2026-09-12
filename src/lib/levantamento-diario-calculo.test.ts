import { describe, expect, it } from "vitest";
import {
  calcularLevantamentoDiario,
  foraDaDataDeInicio,
  rankingsLevantamentoDiario,
  type RegistroFechamento,
} from "./levantamento-diario-calculo";

const HABILITADAS = [
  { id: "prog-1", nome: "Ana" },
  { id: "prog-2", nome: "Bruna" },
];

function vaga(parcial: Partial<RegistroFechamento> & { id: string }): RegistroFechamento {
  return {
    quantidade: 1,
    status: "PRESENCA",
    programadora_id: null,
    colaborador: "",
    ...parcial,
  };
}

describe("calcularLevantamentoDiario", () => {
  it("dia sem nenhuma vaga fechada gera levantamento válido, tudo zerado, sem erro", () => {
    const resultado = calcularLevantamentoDiario([], "2026-09-10", HABILITADAS);
    expect(resultado.totais.vagas).toBe(0);
    expect(resultado.totais.pctPresenca).toBe(0);
    expect(resultado.porProgramador).toEqual([]);
  });

  it("vaga adicionada dia 11 para iniciar dia 15 conta como aguardando e fora da data de início", () => {
    const registros = [
      vaga({ id: "v-futura", programadora_id: "prog-1", status: "AGUARDANDO" }),
    ];
    const resultado = calcularLevantamentoDiario(registros, "2026-09-11", HABILITADAS);
    expect(resultado.totais.vagas).toBe(1);
    expect(resultado.totais.pendentes).toBe(1);
    expect(resultado.totais.confirmadas).toBe(0);
    expect(resultado.totais.pctPresenca).toBe(0);
    expect(foraDaDataDeInicio("2026-09-15", resultado.dataReferencia)).toBe(true);
  });

  it("programador com zero vaga fechada nunca aparece", () => {
    const registros = [vaga({ id: "v1", programadora_id: "prog-1", status: "PRESENCA" })];
    const resultado = calcularLevantamentoDiario(registros, "2026-09-10", HABILITADAS);
    expect(resultado.porProgramador).toHaveLength(1);
    expect(resultado.porProgramador[0]?.programadoraId).toBe("prog-1");
    expect(resultado.porProgramador.some((l) => l.programadoraId === "prog-2")).toBe(false);
  });

  it("percentuais batem com a mesma fórmula de agregar() (denominador = confirmadas)", () => {
    const registros = [
      vaga({ id: "v1", programadora_id: "prog-1", status: "PRESENCA" }),
      vaga({ id: "v2", programadora_id: "prog-1", status: "FALTA" }),
      vaga({ id: "v3", programadora_id: "prog-1", status: "PRESENCA" }),
    ];
    const resultado = calcularLevantamentoDiario(registros, "2026-09-10", HABILITADAS);
    const linha = resultado.porProgramador[0]!;
    expect(linha.vagas).toBe(3);
    expect(linha.presencas).toBe(2);
    expect(linha.faltas).toBe(1);
    expect(linha.pctPresenca).toBeCloseTo((2 / 3) * 100);
    expect(linha.pctFalta).toBeCloseTo((1 / 3) * 100);
  });

  it("carrega o vaga_ids exato usado no cálculo daquela linha (rastreabilidade)", () => {
    const registros = [
      vaga({ id: "v1", programadora_id: "prog-1" }),
      vaga({ id: "v2", programadora_id: "prog-1" }),
    ];
    const resultado = calcularLevantamentoDiario(registros, "2026-09-10", HABILITADAS);
    expect(resultado.porProgramador[0]?.vagaIds.sort()).toEqual(["v1", "v2"]);
  });
});

describe("rankingsLevantamentoDiario", () => {
  it("ordena os 4 rankings de forma ascendente", () => {
    const linhas = [
      {
        programadoraId: "a",
        nome: "A",
        vagaIds: [],
        vagas: 5,
        pendentes: 0,
        confirmadas: 5,
        presencas: 5,
        faltas: 0,
        cancelamentos: 0,
        pctPresenca: 100,
        pctFalta: 0,
        pctCancelamento: 0,
      },
      {
        programadoraId: "b",
        nome: "B",
        vagaIds: [],
        vagas: 2,
        pendentes: 0,
        confirmadas: 2,
        presencas: 1,
        faltas: 1,
        cancelamentos: 0,
        pctPresenca: 50,
        pctFalta: 50,
        pctCancelamento: 0,
      },
    ];
    const rankings = rankingsLevantamentoDiario(linhas);
    expect(rankings.vagasFechadas.map((l) => l.programadoraId)).toEqual(["b", "a"]);
    expect(rankings.pctPresenca.map((l) => l.programadoraId)).toEqual(["b", "a"]);
  });
});
