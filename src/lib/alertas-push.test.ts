import { describe, expect, it } from "vitest";
import { agoraBrasilia, alertaNoHorario, agoraNoFuso, limitesDiaNoFuso } from "./alertas-push";

describe("alertas push", () => {
  it("não restringe pendências por dia da semana", () => {
    expect(alertaNoHorario("sem_vaga_hoje", 15, 0)).toBe(true);
  });
  it("não restringe pendências a horário fixo", () => {
    for (let hora = 0; hora < 24; hora++) expect(alertaNoHorario("aguardando_confirmacao", hora, 2)).toBe(true);
  });
  it("envia dentro da janela em dia útil", () => {
    expect(alertaNoHorario("sem_vaga_hoje", 14, 3)).toBe(true);
    expect(alertaNoHorario("sem_vaga_hoje", 18, 3)).toBe(true);
  });
  it("converte para horário de Brasília", () => {
    const r = agoraBrasilia(new Date("2026-10-09T01:56:00Z"));
    expect(r).toEqual({ dia: "2026-10-08", hora: 22, semana: 4 });
  });
  it("usa o dia local do usuário", () => {
    expect(agoraNoFuso(new Date("2026-10-09T01:56:00Z"), "Asia/Tokyo")).toEqual({ dia: "2026-10-09", hora: 10, semana: 5 });
  });
  it("calcula limites UTC do dia local sem presumir UTC-3", () => {
    expect(limitesDiaNoFuso("2026-10-09", "Asia/Tokyo")).toEqual({ inicio: "2026-10-08T15:00:00.000Z", fim: "2026-10-09T15:00:00.000Z" });
  });
  it("dia de mudança de horário de verão pode durar 25 horas", () => {
    expect(limitesDiaNoFuso("2026-11-01", "America/New_York")).toEqual({ inicio: "2026-11-01T04:00:00.000Z", fim: "2026-11-02T05:00:00.000Z" });
  });
});
