import { describe, expect, it } from "vitest";
import { validarHorariosOportunidade } from "./captacao-horarios";

const horarios = (inicio: string, fim: string, intervaloInicio = "", intervaloFim = "") => ({
  horario_inicio: inicio,
  horario_fim: fim,
  intervalo_inicio: intervaloInicio,
  intervalo_fim: intervaloFim,
});

describe("horários das oportunidades", () => {
  it("aceita a diária das 17h às 02h do dia seguinte", () => {
    expect(validarHorariosOportunidade(horarios("17:00", "02:00"))).toBeNull();
  });
  it("mantém horários do mesmo dia válidos", () => {
    expect(validarHorariosOportunidade(horarios("08:00", "17:00"))).toBeNull();
  });
  it("aceita término à meia-noite", () => {
    expect(validarHorariosOportunidade(horarios("17:00", "00:00"))).toBeNull();
  });
  it("continua bloqueando início e término iguais", () => {
    expect(validarHorariosOportunidade(horarios("17:00", "17:00"))).not.toBeNull();
  });
  it.each([["17:00", ""], ["", "02:00"]])("bloqueia horário incompleto %s / %s", (inicio, fim) => {
    expect(validarHorariosOportunidade(horarios(inicio, fim))).not.toBeNull();
  });
  it("mantém intervalo completo que atravessa a meia-noite válido", () => {
    expect(validarHorariosOportunidade(horarios("17:00", "02:00", "23:45", "00:15"))).toBeNull();
  });
  it("continua bloqueando intervalo incompleto", () => {
    expect(validarHorariosOportunidade(horarios("17:00", "02:00", "23:45"))).not.toBeNull();
  });
});