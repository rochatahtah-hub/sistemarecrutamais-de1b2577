import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

async function receber(resultado: unknown, falhar = false, existentes: { tag: string; close: () => void; data?: unknown }[] = [], falharExibicao = false) {
  const handlers: Record<string, (e: unknown) => void> = {};
  const showNotification = vi.fn(async (_titulo: string, _opcoes: unknown) => { if (falharExibicao) throw new Error("display failed"); });
  const pedidos = vi.fn(async (_url: string, _opcoes?: { body?: string }) => {
    if (falhar) throw new Error("offline");
    return { ok: true, json: async () => resultado };
  });
  const self = {
    addEventListener: (tipo: string, handler: (e: unknown) => void) => { handlers[tipo] = handler; },
    registration: { pushManager: { getSubscription: async () => ({ endpoint: "https://fcm.googleapis.com/push/test" }) }, showNotification, getNotifications: async () => existentes },
  };
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self,
    fetch: pedidos,
    setTimeout: (f: () => void) => f(),
  });
  let tarefa: Promise<void> | undefined;
  const push = handlers['push'];
  if (!push) throw new Error("Handler de push ausente");
  push({ waitUntil: (p: Promise<void>) => { tarefa = p; } });
  await tarefa?.catch(() => {});
  Object.assign(showNotification, { pedidos });
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
    expect(mostrar).not.toHaveBeenCalled();
  });
  it("preserva aviso real do portal", async () => {
    const mostrar = await receber({ interno: false, mensagens: [] });
    expect(mostrar.mock.calls[0]?.[0]).toBe("Nova vaga disponível no Recruta+");
  });
  it("nenhuma pendência não gera aviso genérico e fecha alerta resolvido", async () => {
    const fechar = vi.fn();
    const mostrar = await receber({ interno: true, mensagens: [] }, false, [{ tag: "recruta-alerta-atendimento_pendente", close: fechar }]);
    expect(mostrar).not.toHaveBeenCalled();
    expect(fechar).toHaveBeenCalledTimes(1);
  });
  it("mostra mensagem semanal mesmo sem pendência operacional", async () => {
    const mostrar = await receber({ interno: true, mensagens: [{ titulo: "🌷 Boa semana!", corpo: "Que seus dias sejam leves!", tipo: "boa_semana", url: "/" }] });
    expect(mostrar).toHaveBeenCalledTimes(1);
    expect(mostrar).toHaveBeenCalledWith("🌷 Boa semana!", expect.objectContaining({ tag: "recruta-alerta-boa_semana" }));
  });
  it("confirma o lote somente depois de mostrar o aviso", async () => {
    const mostrar = await receber({ interno: true, lote: "2026-10-10T00:00:00Z", mensagens: [{ titulo: "Recruta+", tipo: "boa_sexta", corpo: "Boa sexta!" }] });
    const pedidos = (mostrar as typeof mostrar & { pedidos: ReturnType<typeof vi.fn> }).pedidos;
    expect(pedidos).toHaveBeenCalledTimes(2);
    expect(JSON.parse(pedidos.mock.calls[1]?.[1].body).recebido).toBe("2026-10-10T00:00:00Z");
    expect(mostrar.mock.invocationCallOrder[0]).toBeLessThan(pedidos.mock.invocationCallOrder[1] ?? 0);
  });
  it("não confirma lote quando a exibição falha", async () => {
    const mostrar = await receber({ interno: true, lote: "lote", mensagens: [{ titulo: "Recruta+", tipo: "boa_sexta" }] }, false, [], true);
    expect((mostrar as typeof mostrar & { pedidos: ReturnType<typeof vi.fn> }).pedidos).toHaveBeenCalledTimes(1);
  });
  it("consulta três vezes e não fecha alertas por falha de rede", async () => {
    const fechar = vi.fn();
    const mostrar = await receber(null, true, [{ tag: "recruta-alerta-atendimento_pendente", close: fechar }]);
    expect((mostrar as typeof mostrar & { pedidos: ReturnType<typeof vi.fn> }).pedidos).toHaveBeenCalledTimes(3);
    expect(fechar).not.toHaveBeenCalled();
  });
  it("não mostra novamente um lote já visível", async () => {
    const mostrar = await receber({ interno: true, lote: "lote", mensagens: [{ titulo: "Recruta+", tipo: "boa_sexta" }] }, false, [{ tag: "recruta-alerta-boa_sexta", data: { lote: "lote" }, close: vi.fn() }]);
    expect(mostrar).not.toHaveBeenCalled();
    expect((mostrar as typeof mostrar & { pedidos: ReturnType<typeof vi.fn> }).pedidos).toHaveBeenCalledTimes(2);
  });
});