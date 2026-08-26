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
  desbloquearColaborador,
  mensagemBloqueio,
  normalizarBloqueio,
  salvarBloqueio,
  verificarBloqueio,
  type BloqueioAtivo,
} from "./bloqueios";

beforeEach(() => {
  mockFrom.mockReset();
  mockRpc.mockReset();
  mockGetUser.mockReset();
});

describe("normalizarBloqueio", () => {
  it("aceita bloqueio geral e limpa o CPF", () => {
    const r = normalizarBloqueio({
      cpf: "086.723.953-01",
      motivo: "Falta grave",
      tipo_bloqueio: "TODAS_EMPRESAS",
    });
    expect(r).toEqual({
      cpf: "08672395301",
      motivo: "Falta grave",
      empresa_id: null,
      tipo_bloqueio: "TODAS_EMPRESAS",
    });
  });

  it("ignora empresa_id enviado quando o bloqueio é geral", () => {
    const r = normalizarBloqueio({
      cpf: "08672395301",
      motivo: "Falta grave",
      tipo_bloqueio: "TODAS_EMPRESAS",
      empresa_id: "empresa-x",
    });
    expect(r.empresa_id).toBeNull();
  });

  it("rejeita CPF incompleto", () => {
    expect(() =>
      normalizarBloqueio({ cpf: "123", motivo: "Falta grave", tipo_bloqueio: "TODAS_EMPRESAS" }),
    ).toThrow("Informe um CPF completo.");
  });

  it("rejeita motivo muito curto", () => {
    expect(() =>
      normalizarBloqueio({ cpf: "08672395301", motivo: "ok", tipo_bloqueio: "TODAS_EMPRESAS" }),
    ).toThrow("Informe o motivo do bloqueio.");
  });

  it("exige empresa quando o bloqueio é específico", () => {
    expect(() =>
      normalizarBloqueio({
        cpf: "08672395301",
        motivo: "Falta grave",
        tipo_bloqueio: "EMPRESA_ESPECIFICA",
      }),
    ).toThrow("Selecione a empresa do bloqueio.");
  });

  it("aceita bloqueio específico com empresa informada", () => {
    const r = normalizarBloqueio({
      cpf: "08672395301",
      motivo: "Falta grave",
      tipo_bloqueio: "EMPRESA_ESPECIFICA",
      empresa_id: "empresa-x",
    });
    expect(r.empresa_id).toBe("empresa-x");
  });
});

describe("mensagemBloqueio", () => {
  const base = {
    bloqueado: true as const,
    cpf: "08672395301",
    nome: "",
    created_at: "",
    bloqueado_por_nome: "",
  };

  it("descreve bloqueio geral com o motivo", () => {
    const msg = mensagemBloqueio({
      ...base,
      motivo: "Furto",
      tipo_bloqueio: "TODAS_EMPRESAS",
      empresa_id: null,
      empresa_nome: "",
    });
    expect(msg).toContain("bloqueado para todas as empresas");
    expect(msg).toContain("Furto");
  });

  it("descreve bloqueio específico com o nome da empresa", () => {
    const msg = mensagemBloqueio({
      ...base,
      motivo: "Furto",
      tipo_bloqueio: "EMPRESA_ESPECIFICA",
      empresa_id: "e1",
      empresa_nome: "ACME Ltda",
    });
    expect(msg).toContain("bloqueado para ACME Ltda");
  });

  it("usa texto padrão quando falta motivo ou nome da empresa", () => {
    const msg = mensagemBloqueio({
      ...base,
      motivo: "",
      tipo_bloqueio: "EMPRESA_ESPECIFICA",
      empresa_id: "e1",
      empresa_nome: "",
    });
    expect(msg).toContain("esta empresa");
    expect(msg).toContain("não informado");
  });
});

describe("verificarBloqueio", () => {
  it("não consulta o banco se o CPF for inválido", async () => {
    const r = await verificarBloqueio("123");
    expect(r).toBeNull();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("retorna null quando não há bloqueio ativo", async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    const r = await verificarBloqueio("08672395301");
    expect(r).toBeNull();
  });

  it("lança erro se a consulta falhar", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: new Error("falha de rede") });
    await expect(verificarBloqueio("08672395301")).rejects.toThrow("falha de rede");
  });

  it("mapeia o bloqueio encontrado", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          motivo: "Furto",
          tipo_bloqueio: "TODAS_EMPRESAS",
          empresa_id: null,
          empresa_nome: "",
          created_at: "2026-01-01",
          bloqueado_por_nome: "Talita",
        },
      ],
      error: null,
    });
    const r = (await verificarBloqueio("086.723.953-01")) as BloqueioAtivo;
    expect(r.bloqueado).toBe(true);
    expect(r.motivo).toBe("Furto");
    expect(mockRpc).toHaveBeenCalledWith("verificar_bloqueio", { _cpf: "08672395301" });
  });

  it("inclui a empresa na chamada quando informada", async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    await verificarBloqueio("08672395301", "empresa-1");
    expect(mockRpc).toHaveBeenCalledWith("verificar_bloqueio", {
      _cpf: "08672395301",
      _empresa_id: "empresa-1",
    });
  });
});

describe("salvarBloqueio", () => {
  it("valida os dados antes de consultar o banco", async () => {
    await expect(
      salvarBloqueio({ cpf: "123", motivo: "Furto", tipo_bloqueio: "TODAS_EMPRESAS" }),
    ).rejects.toThrow("Informe um CPF completo.");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("impede bloqueio duplicado ativo na mesma abrangência", async () => {
    mockFrom.mockReturnValueOnce(chainResolvendo({ data: [{ id: "existente" }], error: null }));
    await expect(
      salvarBloqueio({ cpf: "08672395301", motivo: "Furto", tipo_bloqueio: "TODAS_EMPRESAS" }),
    ).rejects.toThrow("Este colaborador já possui um bloqueio ativo para esta abrangência.");
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("cria um novo bloqueio quando não há duplicidade", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "user-1" } } });
    mockFrom
      .mockReturnValueOnce(chainResolvendo({ data: [], error: null }))
      .mockReturnValueOnce(chainResolvendo({ data: { nome: "Talita" }, error: null }))
      .mockReturnValueOnce(chainResolvendo({ data: null, error: null }));

    await salvarBloqueio({ cpf: "08672395301", motivo: "Furto", tipo_bloqueio: "TODAS_EMPRESAS" });

    expect(mockFrom).toHaveBeenNthCalledWith(1, "colaboradores_bloqueados");
    expect(mockFrom).toHaveBeenNthCalledWith(2, "profiles");
    expect(mockFrom).toHaveBeenNthCalledWith(3, "colaboradores_bloqueados");
  });

  it("atualiza um bloqueio existente sem precisar buscar o autor", async () => {
    mockFrom
      .mockReturnValueOnce(chainResolvendo({ data: [], error: null }))
      .mockReturnValueOnce(chainResolvendo({ data: null, error: null }));

    await salvarBloqueio({
      id: "bloqueio-1",
      cpf: "08672395301",
      motivo: "Furto",
      tipo_bloqueio: "TODAS_EMPRESAS",
    });

    expect(mockFrom).toHaveBeenCalledTimes(2);
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("não verifica duplicidade quando o registro está sendo salvo como inativo", async () => {
    mockFrom.mockReturnValueOnce(chainResolvendo({ data: null, error: null }));
    await salvarBloqueio({
      id: "bloqueio-1",
      cpf: "08672395301",
      motivo: "Furto",
      tipo_bloqueio: "TODAS_EMPRESAS",
      ativo: false,
    });
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});

describe("desbloquearColaborador", () => {
  it("marca o bloqueio como inativo", async () => {
    mockFrom.mockReturnValueOnce(chainResolvendo({ data: null, error: null }));
    await expect(desbloquearColaborador("bloqueio-1")).resolves.toBeUndefined();
    expect(mockFrom).toHaveBeenCalledWith("colaboradores_bloqueados");
  });

  it("propaga erro do banco", async () => {
    mockFrom.mockReturnValueOnce(chainResolvendo({ data: null, error: new Error("falhou") }));
    await expect(desbloquearColaborador("bloqueio-1")).rejects.toThrow("falhou");
  });
});
