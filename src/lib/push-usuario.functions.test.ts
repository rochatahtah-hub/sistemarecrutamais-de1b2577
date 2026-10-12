import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn };
  return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
const enviar = vi.hoisted(() => vi.fn(async () => ({ enviados: 1 })));
vi.mock("./push.server", () => ({ enviarAvisoPush: enviar }));
import { testarAlertasUsuario } from "./push-usuario.functions";

beforeEach(() => enviar.mockClear());
async function testar(master: boolean | null, error: unknown = null) {
  const from = vi.fn(() => {
    const builder: unknown = new Proxy({}, { get: (_, key) => key === "then"
      ? (resolve: (v: unknown) => void) => resolve({ data: { id: "inscricao", mensagens: [], mensagens_em: null }, error: null })
      : () => builder });
    return builder;
  });
  const handler = testarAlertasUsuario as unknown as (args: unknown) => Promise<unknown>;
  const result = handler({ data: { endpoint: "https://fcm.googleapis.com/push/test" }, context: {
    userId: "usuario", supabase: { rpc: vi.fn(async () => ({ data: master, error })), from },
  } });
  return { result, from };
}
describe("teste push exclusivo ADM Master", () => {
  it("Master autorizado consegue solicitar transporte", async () => {
    const { result } = await testar(true);
    await expect(result).resolves.toEqual({ aceito: true });
    expect(enviar).toHaveBeenCalledWith(["https://fcm.googleapis.com/push/test"], 120);
  });
  it("demais perfis são bloqueados antes de consultar ou alterar inscrições", async () => {
    const { result, from } = await testar(false);
    await expect(result).rejects.toThrow("exclusivo do ADM Master");
    expect(from).not.toHaveBeenCalled();
    expect(enviar).not.toHaveBeenCalled();
  });
  it("falha de autorização não libera o envio", async () => {
    const { result } = await testar(null, new Error("indisponível"));
    await expect(result).rejects.toThrow("exclusivo do ADM Master");
    expect(enviar).not.toHaveBeenCalled();
  });
});