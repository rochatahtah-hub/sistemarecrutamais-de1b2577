import { beforeEach, describe, expect, it, vi } from "vitest";

const estado = vi.hoisted(() => ({ logs: [] as { user_id: string; tipo: string; dia: string }[], fila: [] as Record<string, unknown>[], ativo: true, inscrito: true, count: 1, envios: 0, sucesso: true }));
vi.mock("./levantamento-aviso.server", () => ({ enviarAvisosLevantamento: async () => undefined }));
vi.mock("./push.server", () => ({ enviarAvisoPush: async () => {
  estado.envios++;
  return { enviados: estado.sucesso ? 1 : 0, invalidos: [] };
} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  rpc: async () => ({ data: false, error: null }),
  from: (tabela: string) => {
    const filtros: Record<string, unknown> = {};
    let operacao = "leitura";
    let payload: unknown;
    let unico = false;
    const builder: unknown = new Proxy({}, { get: (_, nome) => nome === "then"
      ? (resolve: (value: unknown) => void) => {
        let data: unknown = [];
        if (tabela === "profiles") {
          const perfil = { id: "usuario", ativo: estado.ativo, tenant_id: "tenant", fuso_horario: "America/Sao_Paulo", tenants: { ativo: true, status: "ativo", fuso_horario: "America/Sao_Paulo" } };
          data = unico ? perfil : [perfil];
        } else if (tabela === "tenants") data = [{ id: "tenant", fuso_horario: "America/Sao_Paulo" }];
        else if (tabela === "push_usuarios") {
          if (operacao === "update") estado.fila = (payload as { mensagens: Record<string, unknown>[] }).mensagens;
          data = estado.inscrito ? [{ user_id: "usuario", endpoint: "https://fcm.googleapis.com/push/test", mensagens: estado.fila, mensagens_em: null }] : [];
        } else if (tabela === "push_alertas_log") {
          if (operacao === "upsert") {
            const rows = payload as typeof estado.logs;
            const novas = rows.filter(r => !estado.logs.some(l => l.user_id === r.user_id && l.tipo === r.tipo && l.dia === r.dia));
            estado.logs.push(...novas);
            data = novas;
          } else if (operacao === "delete") estado.logs = estado.logs.filter(l => l.user_id !== filtros['user_id'] || l.dia !== filtros['dia']);
          else data = estado.logs.filter(l => l.user_id === filtros['user_id'] && l.dia === filtros['dia']);
        }
        resolve({ data, error: null, count: estado.count });
      }
      : (...args: unknown[]) => {
        if (nome === "eq") filtros[String(args[0])] = args[1];
        if (nome === "maybeSingle") unico = true;
        if (nome === "upsert" || nome === "update" || nome === "delete") { operacao = String(nome); payload = args[0]; }
        return builder;
      } });
    return builder;
  },
} }));
import { rodarAlertasPush } from "./alertas-push.server";

beforeEach(() => Object.assign(estado, { logs: [], fila: [], ativo: true, inscrito: true, count: 1, envios: 0, sucesso: true }));
describe("disparos semanais pelo mesmo backend Web Push", () => {
  it("segunda sem pendência envia uma vez e não repete nas verificações seguintes", async () => {
    await rodarAlertasPush(new Date("2026-10-05T12:00:00Z"));
    await rodarAlertasPush(new Date("2026-10-05T16:00:00Z"));
    expect(estado.envios).toBe(1);
    expect(estado.logs).toEqual([{ user_id: "usuario", tipo: "boa_semana", dia: "2026-10-05" }]);
  });
  it("sexta é independente de segunda e também envia só uma vez", async () => {
    await rodarAlertasPush(new Date("2026-10-05T12:00:00Z"));
    await rodarAlertasPush(new Date("2026-10-09T12:00:00Z"));
    await rodarAlertasPush(new Date("2026-10-09T17:00:00Z"));
    expect(estado.envios).toBe(2);
    expect(estado.logs.map(l => l.tipo)).toEqual(["boa_semana", "boa_sexta"]);
  });
  it("sem inscrição não envia", async () => {
    estado.inscrito = false;
    await rodarAlertasPush(new Date("2026-10-09T12:00:00Z"));
    expect(estado.envios).toBe(0);
  });
  it("usuário inativo não recebe", async () => {
    estado.ativo = false;
    await rodarAlertasPush(new Date("2026-10-09T12:00:00Z"));
    expect(estado.envios).toBe(0);
  });
  it("falha total permite nova tentativa, sem marcar como entregue", async () => {
    estado.sucesso = false;
    await rodarAlertasPush(new Date("2026-10-09T12:00:00Z"));
    expect(estado.logs).toEqual([]);
    estado.sucesso = true;
    await rodarAlertasPush(new Date("2026-10-09T13:00:00Z"));
    expect(estado.logs).toHaveLength(1);
    expect(estado.envios).toBe(2);
  });
});