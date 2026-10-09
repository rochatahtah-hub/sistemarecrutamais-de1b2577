import { beforeEach, describe, expect, it, vi } from "vitest";

const estado = vi.hoisted(() => ({ permitido: true, admin: true, ativo: true, completo: true, lida: false, chamadas: [] as unknown[][] }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: async (nome: string) => ({ data: nome === "tem_permissao" ? estado.permitido : nome === "has_role" ? estado.admin : false, error: null }),
    from: (tabela: string) => {
      const builder: unknown = new Proxy({}, { get: (_, nome) => nome === "then"
        ? (resolve: (v: unknown) => void) => resolve({ error: null, data: tabela === "profiles"
          ? { nome: "Talita Rocha", ativo: estado.ativo, tenant_id: "tenant-teste", tenants: { ativo: true, status: "ativo" } }
          : tabela === "notificacoes" ? { tipo: "levantamento_diario", chave: "levantamento-diario-2026-10-08", titulo: "Levantamento diário pronto", lida: estado.lida }
          : estado.completo ? [{ data_referencia: "2026-10-08" }] : [] })
        : (...args: unknown[]) => { estado.chamadas.push([tabela, nome, ...args]); return builder; } });
      return builder;
    },
  },
}));
import { avisoLevantamentoAtual } from "./levantamento-aviso.server";
const horario = new Date("2026-10-09T14:00:00Z");
beforeEach(() => Object.assign(estado, { permitido: true, admin: true, ativo: true, completo: true, lida: false, chamadas: [] }));
describe("entrega de levantamento pronto", () => {
  it("personaliza administrador e restringe evento e relatório ao tenant", async () => {
    expect(await avisoLevantamentoAtual("usuario", "evento", horario)).toEqual(expect.objectContaining({ corpo: "Olá Talita Rocha, o levantamento diário já está pronto." }));
    expect(estado.chamadas).toContainEqual(["notificacoes", "eq", "user_id", "usuario"]);
    expect(estado.chamadas).toContainEqual(["notificacoes", "eq", "tenant_id", "tenant-teste"]);
    expect(estado.chamadas).toContainEqual(["levantamentos_diarios", "eq", "tenant_id", "tenant-teste"]);
  });
  it("bloqueia destinatário sem permissão", async () => {
    estado.permitido = false;
    expect(await avisoLevantamentoAtual("usuario", "evento", horario)).toBeNull();
  });
  it("bloqueia usuário que não é administrador", async () => {
    estado.admin = false;
    expect(await avisoLevantamentoAtual("usuario", "evento", horario)).toBeNull();
  });
  it("não envia relatório inexistente", async () => {
    estado.completo = false;
    expect(await avisoLevantamentoAtual("usuario", "evento", horario)).toBeNull();
  });
  it("não repete aviso já lido", async () => {
    estado.lida = true;
    expect(await avisoLevantamentoAtual("usuario", "evento", horario)).toBeNull();
  });
  it("não entrega fora do horário adequado", async () => {
    expect(await avisoLevantamentoAtual("usuario", "evento", new Date("2026-10-10T02:00:00Z"))).toBeNull();
  });
});