import { describe, expect, it, vi } from "vitest";
import { condicaoVerdadeira } from "./alertas-push.server";

function banco(count: number | null, error: unknown = null) {
  const chamadas: unknown[][] = [];
  const builder: unknown = new Proxy({}, {
    get: (_target, nome) => nome === "then"
      ? (resolve: (value: unknown) => void) => resolve({ count, error })
      : (...args: unknown[]) => { chamadas.push([nome, ...args]); return builder; },
  });
  const db = { from: vi.fn(() => builder) } as unknown as Parameters<typeof condicaoVerdadeira>[0];
  return { db, chamadas };
}

const args = ["user-test", "tenant-test", "2026-10-09", "2026-10-09T03:00:00.000Z"] as const;

describe("condições reais dos alertas", () => {
  it("só avisa ausência de cadastro quando o total do dia é zero", async () => {
    expect(await condicaoVerdadeira(banco(0).db, "sem_vaga_hoje", ...args)).toBe(true);
    expect(await condicaoVerdadeira(banco(1).db, "sem_vaga_hoje", ...args)).toBe(false);
  });
  it("restringe vagas ao usuário, empresa e dia de Brasília", async () => {
    const { db, chamadas } = banco(0);
    await condicaoVerdadeira(db, "sem_vaga_hoje", ...args);
    expect(chamadas).toContainEqual(["eq", "tenant_id", "tenant-test"]);
    expect(chamadas).toContainEqual(["eq", "programadora_id", "user-test"]);
    expect(chamadas).toContainEqual(["gte", "created_at", "2026-10-09T03:00:00.000Z"]);
    expect(chamadas).toContainEqual(["lt", "created_at", "2026-10-10T03:00:00.000Z"]);
  });
  it("não transforma falha de consulta em ausência de vaga", async () => {
    await expect(condicaoVerdadeira(banco(null, new Error("indisponível")).db, "sem_vaga_hoje", ...args)).rejects.toThrow();
  });
  it("só envia confirmação, atendimento e finalização quando há pendência", async () => {
    for (const tipo of ["aguardando_confirmacao", "atendimento_pendente", "finalizar_programacoes"] as const) {
      expect(await condicaoVerdadeira(banco(0).db, tipo, ...args)).toBe(false);
      expect(await condicaoVerdadeira(banco(2).db, tipo, ...args)).toBe(true);
    }
  });
  it("finalização considera somente aguardando no dia e atendimento somente pendente", async () => {
    const vagas = banco(1);
    await condicaoVerdadeira(vagas.db, "finalizar_programacoes", ...args);
    expect(vagas.chamadas).toContainEqual(["eq", "status", "AGUARDANDO"]);
    expect(vagas.chamadas).toContainEqual(["eq", "data", "2026-10-09"]);
    const atendimento = banco(1);
    await condicaoVerdadeira(atendimento.db, "atendimento_pendente", ...args);
    expect(atendimento.chamadas).toContainEqual(["eq", "tenant_id", "tenant-test"]);
    expect(atendimento.chamadas).toContainEqual(["eq", "status_validacao", "PENDENTE"]);
  });
});