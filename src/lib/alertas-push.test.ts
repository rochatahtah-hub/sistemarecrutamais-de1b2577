import { describe, expect, it } from "vitest";
import { agoraBrasilia, alertaNoHorario } from "./alertas-push";

describe("alertas push", () => {
  it("nunca envia no domingo", () => {
    expect(alertaNoHorario("sem_vaga_hoje", 15, 0)).toBe(false);
  });
  it("não envia fora da janela (madrugada)", () => {
    expect(alertaNoHorario("aguardando_confirmacao", 3, 2)).toBe(false);
  });
  it("envia dentro da janela em dia útil", () => {
    expect(alertaNoHorario("sem_vaga_hoje", 14, 3)).toBe(true);
    expect(alertaNoHorario("sem_vaga_hoje", 18, 3)).toBe(false);
  });
  it("converte para horário de Brasília", () => {
    const r = agoraBrasilia(new Date("2026-10-09T01:56:00Z"));
    expect(r).toEqual({ dia: "2026-10-08", hora: 22, semana: 4 });
  });
});
