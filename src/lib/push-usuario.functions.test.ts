import { beforeEach, describe, expect, it, vi } from "vitest";

const enviar = vi.hoisted(() => vi.fn(async () => ({ enviados: 1 })));
vi.mock("./push.server", () => ({ enviarAvisoPush: enviar }));
import { solicitarTesteDeAlerta } from "./push-usuario.functions";

beforeEach(() => enviar.mockClear());
function testar(master: boolean | null, error: unknown = null) {
  const from = vi.fn(() => {
    const builder: unknown = new Proxy({}, { get: (_, key) => key === "then"
      ? (resolve: (v: unknown) => void) => resolve({ data: { id: "inscricao", mensagens: [], mensagens_em: null }, error: null })
      : () => builder });
    return builder;
  });
  const supabase = { rpc: vi.fn(async () => ({ data: master, error })), from };
  const contexto = { userId: "usuario", supabase } as unknown as Parameters<typeof solicitarTesteDeAlerta>[0];
  return { result: solicitarTesteDeAlerta(contexto, "https://fcm.googleapis.com/push/test"), from, rpc: supabase.rpc };
}
describe("teste push exclusivo ADM Master", () => {
  it("Master autorizado consegue solicitar transporte", async () => {
    const { result, rpc } = testar(true);
    await expect(result).resolves.toEqual({ aceito: true });
    expect(rpc).toHaveBeenCalledWith("eh_super_admin_atual");
    expect(enviar).toHaveBeenCalledWith(["https://fcm.googleapis.com/push/test"], 120);
  });
  it("demais perfis são bloqueados antes de consultar ou alterar inscrições", async () => {
    const { result, from } = testar(false);
    await expect(result).rejects.toThrow("exclusivo do ADM Master");
    expect(from).not.toHaveBeenCalled();
    expect(enviar).not.toHaveBeenCalled();
  });
  it("falha de autorização não libera o envio", async () => {
    const { result, from } = testar(null, new Error("indisponível"));
    await expect(result).rejects.toThrow("exclusivo do ADM Master");
    expect(from).not.toHaveBeenCalled();
    expect(enviar).not.toHaveBeenCalled();
  });
  it("dispositivo fora da lista de provedores não chega a consultar autorização", async () => {
    const rpc = vi.fn(async () => ({ data: true, error: null }));
    const contexto = { userId: "usuario", supabase: { rpc, from: vi.fn() } } as unknown as Parameters<typeof solicitarTesteDeAlerta>[0];
    await expect(solicitarTesteDeAlerta(contexto, "https://servidor-qualquer.com/push")).rejects.toThrow("Dispositivo inválido");
    expect(rpc).not.toHaveBeenCalled();
  });
});
