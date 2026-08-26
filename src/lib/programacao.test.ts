import { beforeEach, describe, expect, it, vi } from "vitest";
import { chainResolvendo } from "@/test/supabaseMock";

const { mockFrom, mockRpc, mockGetUser } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mockFrom, rpc: mockRpc, auth: { getUser: mockGetUser } },
}));

import {
  confirmarProgramacao,
  criarProgramacao,
  formatarCPF,
  formatarTelefone,
  normalizarTransporte,
  soDigitos,
  termoSeguro,
  type Candidato,
  type NovaProgramacao,
} from "./programacao";

beforeEach(() => {
  mockFrom.mockReset();
  mockRpc.mockReset();
  mockGetUser.mockReset();
});

const candidatoBase: Candidato = {
  id: "cand-1",
  nome: "Fulano de Tal",
  cpf: "08672395301",
  telefone: "47997695445",
  transporte_proprio: false,
  transporte_tipos: [],
  precisa_fretado: false,
  transporte_observacao: "",
  funcao: "Auxiliar",
  pix_chave: "fulano@pix.com",
  documento_path: "",
  documento_nome: "",
};

const novaProgramacaoBase: NovaProgramacao = {
  candidato: candidatoBase,
  data: "2026-08-25",
  empresa_id: "empresa-1",
  status: "PRESENCA",
};

describe("soDigitos", () => {
  it("remove tudo que não é dígito", () => {
    expect(soDigitos("086.723.953-01")).toBe("08672395301");
  });
});

describe("formatarCPF", () => {
  it("formata um CPF completo", () => {
    expect(formatarCPF("08672395301")).toBe("086.723.953-01");
  });

  it("formata progressivamente enquanto a pessoa digita", () => {
    expect(formatarCPF("086723")).toBe("086.723");
  });
});

describe("formatarTelefone", () => {
  it("formata celular com 9 dígitos", () => {
    expect(formatarTelefone("47997695445")).toBe("(47) 99769-5445");
  });

  it("formata fixo com 8 dígitos", () => {
    expect(formatarTelefone("4732221100")).toBe("(47) 3222-1100");
  });
});

describe("termoSeguro", () => {
  it("substitui caracteres que quebrariam o filtro do PostgREST por espaço", () => {
    const r = termoSeguro('João (Silva), 100% "top"');
    expect(r).not.toMatch(/[,()%*"\\]/);
    expect(r).toContain("João");
    expect(r).toContain("Silva");
    expect(r).toContain("100");
    expect(r).toContain("top");
  });

  it("troca quebras de linha e tabs por espaço", () => {
    expect(termoSeguro("linha1\nlinha2\ttab")).toBe("linha1 linha2 tab");
  });

  it("limita a 80 caracteres", () => {
    expect(termoSeguro("a".repeat(200))).toHaveLength(80);
  });
});

describe("normalizarTransporte", () => {
  it("zera tipos e observação quando não tem transporte próprio", () => {
    const r = normalizarTransporte({ transporte_proprio: false, transporte_tipos: ["carro"] });
    expect(r).toEqual({
      transporte_proprio: false,
      transporte_tipos: [],
      precisa_fretado: false,
      transporte_observacao: "",
    });
  });

  it("remove tipos duplicados e inválidos quando tem transporte próprio", () => {
    const r = normalizarTransporte({
      transporte_proprio: true,
      transporte_tipos: ["carro", "carro", "aviao"],
    });
    expect(r.transporte_tipos).toEqual(["carro"]);
  });

  it("limita a observação a 500 caracteres", () => {
    const r = normalizarTransporte({ transporte_observacao: "a".repeat(600) });
    expect(r.transporte_observacao).toHaveLength(500);
  });
});

describe("criarProgramacao", () => {
  it("recusa programar um colaborador bloqueado e não grava nada", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          motivo: "Furto",
          tipo_bloqueio: "TODAS_EMPRESAS",
          empresa_id: null,
          empresa_nome: "",
          created_at: "",
          bloqueado_por_nome: "",
        },
      ],
      error: null,
    });

    await expect(criarProgramacao(novaProgramacaoBase)).rejects.toThrow(/bloqueado/i);
    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("exige sessão válida antes de gravar a vaga", async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    await expect(criarProgramacao(novaProgramacaoBase)).rejects.toThrow(
      "Sessão expirada. Faça login novamente.",
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("cria a vaga quando o colaborador não está bloqueado", async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "uid-1" } } });
    mockFrom
      .mockReturnValueOnce(
        chainResolvendo({ data: { nome: "Talita", meta_quinzena: 0 }, error: null }),
      )
      .mockReturnValueOnce(chainResolvendo({ data: { id: "colab-1" }, error: null }))
      .mockReturnValueOnce(chainResolvendo({ data: null, error: null }))
      .mockReturnValueOnce(chainResolvendo({ data: null, error: null }));

    const r = await criarProgramacao(novaProgramacaoBase);

    expect(r).toEqual({ metaAtingida: false, mensagem: "" });
    expect(mockFrom).toHaveBeenNthCalledWith(1, "profiles");
    expect(mockFrom).toHaveBeenNthCalledWith(2, "colaboradores");
    expect(mockFrom).toHaveBeenNthCalledWith(3, "vagas");
    expect(mockFrom).toHaveBeenNthCalledWith(4, "profiles");
  });

  it("propaga erro ao gravar a vaga", async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "uid-1" } } });
    mockFrom
      .mockReturnValueOnce(
        chainResolvendo({ data: { nome: "Talita", meta_quinzena: 0 }, error: null }),
      )
      .mockReturnValueOnce(chainResolvendo({ data: { id: "colab-1" }, error: null }))
      .mockReturnValueOnce(chainResolvendo({ data: null, error: new Error("falhou ao gravar") }));

    await expect(criarProgramacao(novaProgramacaoBase)).rejects.toThrow("falhou ao gravar");
  });
});

describe("confirmarProgramacao", () => {
  it("confirma presença e verifica a meta", async () => {
    mockFrom.mockReturnValueOnce(chainResolvendo({ data: null, error: null }));
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "uid-1" } } });
    mockFrom.mockReturnValueOnce(
      chainResolvendo({ data: { nome: "Talita", meta_quinzena: 0 }, error: null }),
    );

    const r = await confirmarProgramacao({ id: "vaga-1", status: "PRESENCA" });

    expect(r).toEqual({ metaAtingida: false, mensagem: "" });
    expect(mockFrom).toHaveBeenNthCalledWith(1, "vagas");
    expect(mockFrom).toHaveBeenNthCalledWith(2, "profiles");
  });

  it("não verifica meta para falta ou cancelamento", async () => {
    mockFrom.mockReturnValueOnce(chainResolvendo({ data: null, error: null }));
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "uid-1" } } });

    const r = await confirmarProgramacao({ id: "vaga-1", status: "FALTA" });

    expect(r).toEqual({ metaAtingida: false, mensagem: "" });
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("propaga erro ao atualizar o status", async () => {
    mockFrom.mockReturnValueOnce(chainResolvendo({ data: null, error: new Error("falhou") }));
    await expect(confirmarProgramacao({ id: "vaga-1", status: "FALTA" })).rejects.toThrow("falhou");
  });
});
