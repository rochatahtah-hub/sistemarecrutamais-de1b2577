import { describe, expect, it } from "vitest";
import { formatarResumoVaga } from "./tipos";

describe("formatarResumoVaga", () => {
  it("não mostra nenhuma linha quando não há dado nenhum", () => {
    expect(formatarResumoVaga({})).toEqual([]);
  });

  it("mostra só as linhas com dado real, sem inventar as demais", () => {
    expect(formatarResumoVaga({ cidade: "Joinville", bairro: "Centro" })).toEqual([
      "📍 Joinville — Centro",
    ]);
    expect(formatarResumoVaga({ genero: "UNISSEX" })).toEqual(["👤 Unissex"]);
  });

  it("só mostra horário quando início e fim estão preenchidos", () => {
    expect(formatarResumoVaga({ horario_inicio: "08:00" })).toEqual([]);
    expect(formatarResumoVaga({ horario_inicio: "08:00", horario_fim: "17:00" })).toEqual([
      "🕐 08:00 às 17:00",
    ]);
  });

  it("combina fretado com os detalhes numa linha só", () => {
    expect(
      formatarResumoVaga({ transporte_tipo: "FRETADO", transporte_detalhes: "Embarque às 6h" }),
    ).toEqual(["🚌 Tem fretado — Embarque às 6h"]);
    expect(formatarResumoVaga({ transporte_tipo: "FRETADO" })).toEqual(["🚌 Tem fretado"]);
    expect(formatarResumoVaga({ transporte_tipo: "CONTA_PROPRIA" })).toEqual([
      "🚗 Deslocamento por conta própria",
    ]);
  });

  it("monta o resumo completo na ordem esperada", () => {
    expect(
      formatarResumoVaga({
        cidade: "Joinville",
        bairro: "Centro",
        horario_inicio: "08:00",
        horario_fim: "17:00",
        genero: "FEMININO",
        transporte_tipo: "FRETADO",
        transporte_detalhes: "Praça central",
      }),
    ).toEqual([
      "📍 Joinville — Centro",
      "🕐 08:00 às 17:00",
      "👤 Feminino",
      "🚌 Tem fretado — Praça central",
    ]);
  });
});
