import { describe, expect, it } from "vitest";
import { mensagemSemanal } from "./push-semanal";

describe("mensagens semanais independentes de pendências", () => {
  it("segunda-feira tem mensagem de boa semana", () => {
    expect(mensagemSemanal(new Date("2026-10-05T15:00:00Z"))?.tipo).toBe("boa_semana");
  });
  it("sexta-feira tem mensagem de encerramento", () => {
    expect(mensagemSemanal(new Date("2026-10-09T15:00:00Z"))?.tipo).toBe("boa_sexta");
  });
  it("09/10 permite o primeiro envio agora e o segundo somente a partir das 18h de São Paulo", () => {
    expect(mensagemSemanal(new Date("2026-10-09T11:44:00Z"))?.tipo).toBe("boa_sexta");
    expect(mensagemSemanal(new Date("2026-10-09T20:59:59Z"))?.tipo).toBe("boa_sexta");
    expect(mensagemSemanal(new Date("2026-10-09T21:00:00Z"))?.tipo).toBe("boa_sexta_18h");
  });
  it("a exceção às 18h de São Paulo não depende do fuso do destinatário", () => {
    expect(mensagemSemanal(new Date("2026-10-09T21:00:00Z"), "Asia/Tokyo")?.tipo).toBe("boa_sexta_18h");
  });
  it("outras sextas mantêm somente um tipo de mensagem", () => {
    expect(mensagemSemanal(new Date("2026-10-16T21:00:00Z"))?.tipo).toBe("boa_sexta");
  });
  it("outros dias não geram mensagens semanais", () => {
    for (const dia of [6, 7, 8, 10, 11]) expect(mensagemSemanal(new Date(`2026-10-${String(dia).padStart(2, "0")}T15:00:00Z`))).toBeNull();
  });
  it("dia da semana é o do fuso do destinatário", () => {
    const hora = new Date("2026-10-09T01:00:00Z");
    expect(mensagemSemanal(hora, "America/Sao_Paulo")).toBeNull();
    expect(mensagemSemanal(hora, "Asia/Tokyo")?.tipo).toBe("boa_sexta");
  });
});