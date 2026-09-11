import { createHash, createHmac, timingSafeEqual } from "crypto";

export const AGIZZE_TENANT_ID = "e060a2ca-f718-49b5-bf59-ec43c040336e";

export function somenteDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

export function normalizarEmailComercial(valor: string) {
  return valor.trim().toLowerCase();
}

export function hashTokenCadastro(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function assinaturaMercadoPagoValida({
  assinatura,
  requestId,
  dataId,
  segredo,
}: {
  assinatura: string;
  requestId: string;
  dataId: string;
  segredo: string;
}) {
  const partes = Object.fromEntries(
    assinatura.split(",").map((parte) => {
      const [chave, valor] = parte.trim().split("=");
      return [chave, valor];
    }),
  );
  const ts = partes.ts ?? "";
  const recebido = partes.v1 ?? "";
  if (!ts || !recebido || !requestId || !dataId || !segredo) return false;
  const manifesto = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const esperado = createHmac("sha256", segredo).update(manifesto).digest("hex");
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function mercadoPagoFetch<T>(caminho: string, init?: RequestInit): Promise<T> {
  const token = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!token) throw new Error("Pagamento temporariamente indisponível. Fale com nossa equipe comercial.");
  const resposta = await fetch(`https://api.mercadopago.com${caminho}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const corpo = (await resposta.json().catch(() => ({}))) as T & { message?: string };
  if (!resposta.ok) {
    console.error("[mercado-pago]", resposta.status, corpo.message ?? "Falha no provedor");
    throw new Error("Não foi possível iniciar o pagamento. Tente novamente.");
  }
  return corpo;
}