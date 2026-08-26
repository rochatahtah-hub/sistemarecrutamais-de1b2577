import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chainResolvendo } from "@/test/supabaseMock";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mockFrom } }));

import {
  diasDePermanencia,
  FAIXAS_PERMANENCIA,
  media,
  permanenciaTexto,
  salvarCandidatoCLT,
  salvarCargoCLT,
  salvarEmpresaCLT,
} from "./rs";

beforeEach(() => {
  mockFrom.mockReset();
});

describe("diasDePermanencia", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-25T12:00:00"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retorna null sem data de admissão", () => {
    expect(diasDePermanencia({ data_admissao: null, data_desligamento: null })).toBeNull();
  });

  it("conta até hoje quando o candidato ainda está ativo", () => {
    expect(diasDePermanencia({ data_admissao: "2026-08-15", data_desligamento: null })).toBe(10);
  });

  it("conta até a data de desligamento quando já saiu", () => {
    expect(
      diasDePermanencia({ data_admissao: "2026-08-01", data_desligamento: "2026-08-11" }),
    ).toBe(10);
  });

  it("nunca retorna negativo", () => {
    expect(
      diasDePermanencia({ data_admissao: "2026-08-20", data_desligamento: "2026-08-10" }),
    ).toBe(0);
  });
});

describe("permanenciaTexto", () => {
  it("mostra em dias quando é menos de um mês", () => {
    expect(permanenciaTexto(1)).toBe("1 dia");
    expect(permanenciaTexto(15)).toBe("15 dias");
  });

  it("mostra em meses e dias quando é menos de um ano", () => {
    expect(permanenciaTexto(45)).toBe("1 mês e 15 dias");
  });

  it("mostra em anos e meses quando passa de um ano", () => {
    expect(permanenciaTexto(400)).toBe("1 ano e 1 mês");
  });

  it("usa travessão quando não há permanência calculada", () => {
    expect(permanenciaTexto(null)).toBe("—");
  });
});

describe("FAIXAS_PERMANENCIA", () => {
  it("classifica os limites de cada faixa corretamente", () => {
    const classificar = (d: number) => FAIXAS_PERMANENCIA.find((f) => f.teste(d))?.rotulo;
    expect(classificar(30)).toBe("Até 30 dias");
    expect(classificar(31)).toBe("31 a 90 dias");
    expect(classificar(90)).toBe("31 a 90 dias");
    expect(classificar(91)).toBe("91 a 180 dias");
    expect(classificar(365)).toBe("181 a 365 dias");
    expect(classificar(366)).toBe("Mais de 1 ano");
    expect(classificar(731)).toBe("Mais de 2 anos");
  });
});

describe("media", () => {
  it("calcula a média arredondada", () => {
    expect(media([10, 20, 15])).toBe(15);
    expect(media([1, 2])).toBe(2);
  });

  it("retorna 0 para lista vazia", () => {
    expect(media([])).toBe(0);
  });
});

describe("salvarCandidatoCLT", () => {
  const base = {
    nome: "Fulano de Tal",
    cpf: "111.444.777-35",
    empresa_id: "empresa-1",
    cargo: "Analista",
    data_admissao: "2026-08-01",
    status: "ativo" as const,
    data_desligamento: null,
  };

  it("rejeita nome vazio", async () => {
    await expect(salvarCandidatoCLT({ ...base, nome: "  " })).rejects.toThrow(
      "Informe o nome completo do candidato.",
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("rejeita CPF com dígito verificador inválido", async () => {
    await expect(salvarCandidatoCLT({ ...base, cpf: "111.444.777-36" })).rejects.toThrow(
      "Informe um CPF válido.",
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("exige data de desligamento quando o status é desligado", async () => {
    await expect(
      salvarCandidatoCLT({ ...base, status: "desligado", data_desligamento: null }),
    ).rejects.toThrow("Informe a data de desligamento.");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("limpa os dados de desligamento quando o status volta a ativo", async () => {
    const insert = vi.fn().mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValueOnce({ insert });

    await salvarCandidatoCLT({
      ...base,
      status: "ativo",
      data_desligamento: "2026-01-01",
      motivo_desligamento: "não deveria ir para o banco",
    });

    expect(mockFrom).toHaveBeenCalledWith("rs_candidatos");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ data_desligamento: null, motivo_desligamento: "" }),
    );
  });

  it("traduz violação de CPF duplicado em mensagem amigável", async () => {
    mockFrom.mockReturnValueOnce(
      chainResolvendo({ data: null, error: { code: "23505", message: "duplicate key" } }),
    );
    await expect(salvarCandidatoCLT(base)).rejects.toThrow(
      "Já existe um candidato CLT com esse CPF.",
    );
  });
});

describe("salvarEmpresaCLT", () => {
  it("rejeita nome vazio", async () => {
    await expect(salvarEmpresaCLT({ nome: "   " })).rejects.toThrow("Informe o nome da empresa.");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("traduz nome duplicado em mensagem amigável", async () => {
    mockFrom.mockReturnValueOnce(
      chainResolvendo({ data: null, error: { code: "23505", message: "duplicate key" } }),
    );
    await expect(salvarEmpresaCLT({ nome: "ACME" })).rejects.toThrow(
      "Já existe uma empresa CLT com esse nome.",
    );
  });
});

describe("salvarCargoCLT", () => {
  it("rejeita nome vazio", async () => {
    await expect(salvarCargoCLT({ nome: " " })).rejects.toThrow("Informe o nome do cargo.");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("traduz cargo duplicado em mensagem amigável", async () => {
    mockFrom.mockReturnValueOnce(
      chainResolvendo({ data: null, error: { code: "23505", message: "duplicate key" } }),
    );
    await expect(salvarCargoCLT({ nome: "Analista" })).rejects.toThrow(
      "Esse cargo já está cadastrado.",
    );
  });
});
