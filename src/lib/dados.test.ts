import { beforeEach, describe, expect, it, vi } from "vitest";
import { chainResolvendo } from "@/test/supabaseMock";

const { from, rpc } = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from, rpc } }));
import { excluirFicha } from "./dados";

beforeEach(() => { from.mockReset(); rpc.mockReset(); });

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

  function comAtendimento(pagamento = 0, feedback = 0) {
    for (const count of [pagamento, 1, 1, feedback]) {
      from.mockReturnValueOnce(chainResolvendo({ count, error: null } as never));
    }
  }

  it("permite ao Master apagar vaga lançada por engano mesmo com conferência e divergência", async () => {
    comAtendimento();
    rpc.mockResolvedValue({ data: true, error: null });
    from.mockReturnValueOnce(chainResolvendo({ data: [{ id: "vaga-erro-voltou-aguardando" }], error: null }));
    await excluirFicha("vaga-erro-voltou-aguardando");
    expect(rpc).toHaveBeenCalledExactlyOnceWith("eh_super_admin_atual");
    expect(from).toHaveBeenCalledTimes(5);
  });

  it("mantém atendimento protegido para quem não é Master", async () => {
    comAtendimento();
    rpc.mockResolvedValue({ data: false, error: null });
    await expect(excluirFicha("vaga-erro")).rejects.toThrow("conferência de atendimento, divergência de atendimento");
    expect(from).toHaveBeenCalledTimes(4);
  });

  it("mantém pagamento protegido mesmo para Master com atendimento", async () => {
    comAtendimento(1);
    rpc.mockResolvedValue({ data: true, error: null });
    await expect(excluirFicha("vaga-erro")).rejects.toThrow("pagamento");
    expect(from).toHaveBeenCalledTimes(4);
  });

  it("mantém feedback protegido mesmo para Master com atendimento", async () => {
    comAtendimento(0, 1);
    rpc.mockResolvedValue({ data: true, error: null });
    await expect(excluirFicha("vaga-erro")).rejects.toThrow("feedback");
    expect(from).toHaveBeenCalledTimes(4);
  });

  it("não apaga quando não consegue verificar a permissão Master", async () => {
    comAtendimento();
    rpc.mockResolvedValue({ data: null, error: new Error("Falha ao verificar Master") });
    await expect(excluirFicha("vaga-erro")).rejects.toThrow("Falha ao verificar Master");
    expect(from).toHaveBeenCalledTimes(4);
  });
});