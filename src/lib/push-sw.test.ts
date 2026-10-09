import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

async function receber(resultado: unknown, falhar = false) {
  const handlers: Record<string, (e: unknown) => void> = {};
  const showNotification = vi.fn(async () => undefined);
  const self = {
    addEventListener: (tipo: string, handler: (e: unknown) => void) => { handlers[tipo] = handler; },
    registration: { pushManager: { getSubscription: async () => ({ endpoint: "https://fcm.googleapis.com/push/test" }) }, showNotification },
  };
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self,
    fetch: async () => {
      if (falhar) throw new Error("offline");
      return { ok: true, json: async () => resultado };
    },
  });
  let tarefa: Promise<void> | undefined;
  const push = handlers.push;
  if (!push) throw new Error("Handler de push ausente");
  push({ waitUntil: (p: Promise<void>) => { tarefa = p; } });
  await tarefa;
  return showNotification;
}

describe("notificações do aplicativo fechado", () => {
  it("mostra alerta real e abre somente caminho local", async () => {
    const mostrar = await receber({ interno: true, mensagens: [{ titulo: "Recruta+", corpo: "Você tem vagas aguardando confirmação.", tipo: "aguardando_confirmacao", url: "//evil.example" }] });
    expect(mostrar).toHaveBeenCalledWith("Recruta+", expect.objectContaining({ body: "Você tem vagas aguardando confirmação.", data: { url: "/" } }));
    expect(mostrar).toHaveBeenCalledTimes(1);
  });
  it("não inventa nova vaga quando a consulta falha", async () => {
    const mostrar = await receber(null, true);
    expect(mostrar.mock.calls[0]?.[0]).toBe("Recruta+");
  });
  it("preserva aviso real do portal", async () => {
    const mostrar = await receber({ interno: false, mensagens: [] });
    expect(mostrar.mock.calls[0]?.[0]).toBe("Nova vaga disponível no Recruta+");
  });
});