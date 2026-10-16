import { beforeEach, describe, expect, it, vi } from "vitest";
import { chainResolvendo } from "@/test/supabaseMock";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));
import { excluirFicha } from "./dados";

beforeEach(() => from.mockReset());

describe("exclusão de vagas", () => {
  function semVinculos() {
    for (let i = 0; i < 4; i++) from.mockReturnValueOnce(chainResolvendo({ data: [], error: null }));
  }

  it("exclui a vaga autorizada pelo banco sem filtrar quem a fechou", async () => {
    semVinculos();
    const eq = vi.fn(() => chainResolvendo({ data: [{ id: "vaga-outro-responsavel" }], error: null }));
    from.mockReturnValueOnce({ delete: () => ({ eq }) });
    await excluirFicha("vaga-outro-responsavel");
    expect(eq).toHaveBeenCalledExactlyOnceWith("id", "vaga-outro-responsavel");
  });

  it("recusa exclusão negada pelas permissões do banco", async () => {
    semVinculos();
    from.mockReturnValueOnce(chainResolvendo({ data: [], error: null }));
    await expect(excluirFicha("vaga-outro-responsavel")).rejects.toThrow("você não tem permissão");
  });

  it("mantém a proteção de pagamentos vinculados", async () => {
    from.mockReturnValueOnce(chainResolvendo({ count: 1, error: null } as never));
    for (let i = 0; i < 3; i++) from.mockReturnValueOnce(chainResolvendo({ data: [], error: null }));
    await expect(excluirFicha("vaga-vinculada")).rejects.toThrow("pagamento");
    expect(from).toHaveBeenCalledTimes(4);
  });

  it("não apaga quando a leitura de vínculos falha", async () => {
    from.mockReturnValueOnce(chainResolvendo({ error: new Error("Falha de consulta") }));
    for (let i = 0; i < 3; i++) from.mockReturnValueOnce(chainResolvendo({ data: [], error: null }));
    await expect(excluirFicha("vaga")).rejects.toThrow("Falha de consulta");
    expect(from).toHaveBeenCalledTimes(4);
  });
});