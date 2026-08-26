import { beforeEach, describe, expect, it, vi } from "vitest";
import { chainResolvendo } from "@/test/supabaseMock";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mockFrom } }));

import { buscarPagamentos, derivarStatusPagamento, salvarPagamento } from "./pagamentos";

beforeEach(() => {
  mockFrom.mockReset();
});

describe("derivarStatusPagamento", () => {
  it("usa o status do registro de pagamento quando existe", () => {
    expect(derivarStatusPagamento("PRESENCA", { status: "PAGO" })).toBe("PAGO");
  });

  it("marca como aguardando quando houve presença mas ainda não foi pago", () => {
    expect(derivarStatusPagamento("PRESENCA", null)).toBe("AGUARDANDO");
  });

  it("marca como bloqueado quando não houve presença e não há registro de pagamento", () => {
    expect(derivarStatusPagamento("FALTA", null)).toBe("BLOQUEADO");
    expect(derivarStatusPagamento("CANCELAMENTO", null)).toBe("BLOQUEADO");
  });
});

describe("buscarPagamentos", () => {
  it("mantém presenças mesmo sem registro de pagamento e usa dados do candidato", async () => {
    mockFrom.mockReturnValueOnce(
      chainResolvendo({
        data: [
          {
            id: "vaga-1",
            data: "2026-08-20",
            status: "PRESENCA",
            descricao: null,
            empresa_id: "empresa-1",
            empresas: { nome: "ACME" },
            candidatos: {
              id: "cand-1",
              nome: "Fulano",
              cpf: "08672395301",
              telefone: "47999999999",
              pix_chave: "fulano@pix.com",
            },
            pagamentos: null,
          },
        ],
        error: null,
      }),
    );
    const r = await buscarPagamentos();
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ nome: "Fulano", pix: "fulano@pix.com", status: "AGUARDANDO" });
  });

  it("descarta falta/cancelamento sem nenhum registro de pagamento", async () => {
    mockFrom.mockReturnValueOnce(
      chainResolvendo({
        data: [
          {
            id: "vaga-2",
            data: "2026-08-20",
            status: "FALTA",
            descricao: null,
            empresa_id: null,
            empresas: null,
            candidatos: null,
            pagamentos: null,
          },
        ],
        error: null,
      }),
    );
    const r = await buscarPagamentos();
    expect(r).toHaveLength(0);
  });

  it("mantém falta/cancelamento quando já existe registro de pagamento (ex: PROBLEMA)", async () => {
    mockFrom.mockReturnValueOnce(
      chainResolvendo({
        data: [
          {
            id: "vaga-3",
            data: "2026-08-20",
            status: "CANCELAMENTO",
            descricao: null,
            empresa_id: null,
            empresas: null,
            candidatos: null,
            pagamentos: {
              id: "pg-1",
              status: "PROBLEMA",
              observacao: "cobrar depois",
              pago_em: null,
              pago_por_nome: "",
            },
          },
        ],
        error: null,
      }),
    );
    const r = await buscarPagamentos();
    expect(r).toHaveLength(1);
    expect(r[0]?.status).toBe("PROBLEMA");
  });

  it("lida com pagamentos vindo como array (join do Supabase)", async () => {
    mockFrom.mockReturnValueOnce(
      chainResolvendo({
        data: [
          {
            id: "vaga-4",
            data: "2026-08-20",
            status: "PRESENCA",
            descricao: null,
            empresa_id: null,
            empresas: null,
            candidatos: null,
            pagamentos: [
              {
                id: "pg-2",
                status: "PAGO",
                observacao: "",
                pago_em: "2026-08-21",
                pago_por_nome: "Talita",
              },
            ],
          },
        ],
        error: null,
      }),
    );
    const r = await buscarPagamentos();
    expect(r[0]?.status).toBe("PAGO");
    expect(r[0]?.pago_por_nome).toBe("Talita");
  });

  it("propaga erro do banco", async () => {
    mockFrom.mockReturnValueOnce(chainResolvendo({ data: null, error: new Error("falha") }));
    await expect(buscarPagamentos()).rejects.toThrow("falha");
  });
});

describe("salvarPagamento", () => {
  it("impede marcar como pago um pagamento que já está pago", async () => {
    await expect(
      salvarPagamento({ vagaId: "vaga-1", status: "PAGO", statusAtual: "PAGO" }),
    ).rejects.toThrow("Este pagamento já foi registrado como pago.");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("permite corrigir um pagamento marcado como problema", async () => {
    mockFrom.mockReturnValueOnce(chainResolvendo({ data: null, error: null }));
    await expect(
      salvarPagamento({ vagaId: "vaga-1", status: "PAGO", statusAtual: "PROBLEMA" }),
    ).resolves.toBeUndefined();
    expect(mockFrom).toHaveBeenCalledWith("pagamentos");
  });

  it("propaga erro do banco ao salvar", async () => {
    mockFrom.mockReturnValueOnce(
      chainResolvendo({ data: null, error: { message: "upsert falhou" } }),
    );
    await expect(salvarPagamento({ vagaId: "vaga-1", status: "PAGO" })).rejects.toThrow(
      "upsert falhou",
    );
  });
});
