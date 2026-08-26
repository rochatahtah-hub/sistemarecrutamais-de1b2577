import { describe, expect, it } from "vitest";
import { cpfValido, soDigitosCpf } from "./diarias";

describe("soDigitosCpf", () => {
  it("remove tudo que não é dígito", () => {
    expect(soDigitosCpf("111.444.777-35")).toBe("11144477735");
  });

  it("limita a 11 dígitos", () => {
    expect(soDigitosCpf("111444777351234")).toBe("11144477735");
  });
});

describe("cpfValido", () => {
  it("aceita um CPF com dígitos verificadores corretos", () => {
    expect(cpfValido("111.444.777-35")).toBe(true);
  });

  it("rejeita quando o segundo dígito verificador está errado", () => {
    expect(cpfValido("111.444.777-36")).toBe(false);
  });

  it("rejeita quando o primeiro dígito verificador está errado", () => {
    expect(cpfValido("111.444.777-45")).toBe(false);
  });

  it("rejeita sequências com todos os dígitos iguais", () => {
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cpfValido("00000000000")).toBe(false);
  });

  it("rejeita CPF incompleto", () => {
    expect(cpfValido("123.456.789")).toBe(false);
  });
});
