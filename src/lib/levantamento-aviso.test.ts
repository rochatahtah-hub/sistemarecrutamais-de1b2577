import { describe, expect, it } from "vitest";
import { mensagemLevantamentoPronto, periodoCompleto } from "./levantamento-aviso";
import { periodoQuinzena } from "./levantamento-quinzena";

describe("aviso de levantamento pronto", () => {
  it("usa o nome da administradora para o diário", () => {
    expect(mensagemLevantamentoPronto("Talita Rocha", "diario")).toBe("Olá Talita Rocha, o levantamento diário já está pronto.");
  });
  it("usa outro administrador e especifica quinzena", () => {
    expect(mensagemLevantamentoPronto("Ana Souza", "quinzena")).toBe("Olá Ana Souza, o levantamento da quinzena já está pronto.");
  });
  it("não declara quinzena pronta se falta um dia", () => {
    const datas = Array.from({ length: 15 }, (_, i) => `2026-10-${String(i + 1).padStart(2, "0")}`);
    expect(periodoCompleto(datas, "2026-10-01", "2026-10-15")).toBe(true);
    expect(periodoCompleto(datas.filter(d => d !== "2026-10-08"), "2026-10-01", "2026-10-15")).toBe(false);
  });
  it("valida o último dia real de fevereiro bissexto", () => {
    const periodo = periodoQuinzena(2028, 2, 2);
    const datas = Array.from({ length: 14 }, (_, i) => `2028-02-${i + 16}`);
    expect(periodoCompleto(datas, periodo.inicio, periodo.fim)).toBe(true);
    expect(periodoCompleto(datas.slice(0, -1), periodo.inicio, periodo.fim)).toBe(false);
  });
});
