import { describe, expect, it } from "vitest";

import {
  conflitoPorErroUnicidade,
  mensagemConflitoContratacao,
  normalizarEmailComercial,
  somenteDigitos,
} from "./comercial.server";

describe("normalização da contratação comercial", () => {
  it("normaliza espaços e maiúsculas do e-mail", () => {
    expect(normalizarEmailComercial("  Nova.Empresa@Example.COM  ")).toBe("nova.empresa@example.com");
  });

  it("trata CNPJ vazio ou com espaços como ausente", () => {
    expect(somenteDigitos("")).toBe("");
    expect(somenteDigitos("   ")).toBe("");
  });

  it("normaliza o mesmo CNPJ com e sem pontuação", () => {
    expect(somenteDigitos("12.345.678/0001-90")).toBe("12345678000190");
    expect(somenteDigitos("12345678000190")).toBe("12345678000190");
  });
});

describe("mensagens de duplicidade comercial", () => {
  it.each([
    ["email", "Já existe uma contratação ativa para este e-mail."],
    ["cnpj", "Já existe uma contratação ativa para este CNPJ."],
    ["email_cnpj", "Já existe uma contratação ativa para este e-mail ou CNPJ."],
  ] as const)("informa o conflito de %s", (conflito, mensagem) => {
    expect(mensagemConflitoContratacao(conflito)).toBe(mensagem);
  });

  it("identifica qual índice venceu uma tentativa simultânea", () => {
    expect(conflitoPorErroUnicidade({ code: "23505", message: "leads_comerciais_email_confirmado_unico" })).toBe("email");
    expect(conflitoPorErroUnicidade({ code: "23505", details: "leads_comerciais_cnpj_confirmado_unico" })).toBe("cnpj");
  });

  it("não classifica outros erros como duplicidade", () => {
    expect(conflitoPorErroUnicidade({ code: "42501", message: "permission denied" })).toBeNull();
  });
});