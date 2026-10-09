import { createPublicKey, generateKeyPairSync, verify as verificarCru } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cabecalhoVapid, enviarAvisoPush } from "./push.server";

/**
 * Conferência independente da assinatura VAPID.
 *
 * O envio de push só pode ser testado de verdade num aparelho real, mas a
 * parte que dá errado em silêncio é a assinatura: se o JWT estiver malformado
 * ou a assinatura no formato errado, o serviço de push recusa com 401 e nada
 * chega, sem pista nenhuma. Aqui o JWT é gerado pelo código de produção e
 * verificado pelo crypto do Node — implementação diferente, então se as duas
 * concordam, o formato está certo.
 */

function b64u(buf: Buffer) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function parDeChaves() {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const jwkPriv = privateKey.export({ format: "jwk" }) as { d: string };
  const jwkPub = createPublicKey(privateKey).export({ format: "jwk" }) as { x: string; y: string };
  const paraBuf = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  const publicaCrua = Buffer.concat([Buffer.from([4]), paraBuf(jwkPub.x), paraBuf(jwkPub.y)]);
  return { publica: b64u(publicaCrua), privada: jwkPriv.d, chaveNode: createPublicKey(privateKey) };
}

describe("assinatura VAPID", () => {
  it("gera um Authorization no formato que o serviço de push espera", async () => {
    const { publica, privada } = parDeChaves();
    const cabecalho = await cabecalhoVapid(
      "https://fcm.googleapis.com/fcm/send/abc123",
      publica,
      privada,
      "mailto:contato@exemplo.com",
    );
    expect(cabecalho).toMatch(/^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]+$/);
  });

  it("usa a origem do endpoint como audiência — e não o caminho completo", async () => {
    const { publica, privada } = parDeChaves();
    const cabecalho = await cabecalhoVapid(
      "https://updates.push.services.mozilla.com/wpush/v2/xyz",
      publica,
      privada,
      "mailto:contato@exemplo.com",
    );
    const jwt = cabecalho.slice("vapid t=".length).split(",")[0]!;
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1]!, "base64url").toString());
    expect(payload.aud).toBe("https://updates.push.services.mozilla.com");
    expect(payload.sub).toBe("mailto:contato@exemplo.com");
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    // Serviços de push recusam validade longa demais (limite usual: 24h).
    expect(payload.exp).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 24 * 60 * 60);
  });

  it("a assinatura confere contra a chave pública, em formato cru r||s", async () => {
    const { publica, privada, chaveNode } = parDeChaves();
    const cabecalho = await cabecalhoVapid(
      "https://fcm.googleapis.com/fcm/send/abc123",
      publica,
      privada,
      "mailto:contato@exemplo.com",
    );
    const jwt = cabecalho.slice("vapid t=".length).split(",")[0]!;
    const [h, p, s] = jwt.split(".");
    const assinatura = Buffer.from(s!, "base64url");
    // JWS ES256 exige exatamente 64 bytes (r e s de 32), nunca DER.
    expect(assinatura.length).toBe(64);
    const confere = verificarCru(
      "sha256",
      Buffer.from(`${h}.${p}`),
      { key: chaveNode, dsaEncoding: "ieee-p1363" },
      assinatura,
    );
    expect(confere).toBe(true);
  });

  it("recusa chave pública que não seja o ponto não comprimido de 65 bytes", async () => {
    const { privada } = parDeChaves();
    await expect(
      cabecalhoVapid("https://fcm.googleapis.com/fcm/send/x", "Zm9v", privada, "mailto:a@b.com"),
    ).rejects.toThrow(/VAPID_PUBLIC_KEY inválida/);
  });
});

describe("transporte Web Push compatível com publicação", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  function preparar(status: number) {
    const chaves = parDeChaves();
    vi.stubEnv("VAPID_PUBLIC_KEY", chaves.publica);
    vi.stubEnv("VAPID_PRIVATE_KEY", chaves.privada);
    const envio = vi.fn(async (_url: unknown, init?: RequestInit) => {
      if (init?.redirect !== "manual") throw new Error("Redirect mode unsupported by Workers");
      return new Response(null, { status });
    });
    vi.stubGlobal("fetch", envio);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    return envio;
  }
  it("envia com modo suportado e confirma aceitação pelo provedor", async () => {
    const envio = preparar(201);
    expect(await enviarAvisoPush(["https://fcm.googleapis.com/fcm/send/test"], 3600))
      .toEqual({ enviados: 1, invalidos: [], falhas: 0 });
    expect(envio).toHaveBeenCalledTimes(1);
  });
  it("bloqueia redirecionamentos sem visitar o destino", async () => {
    const envio = preparar(302);
    expect(await enviarAvisoPush(["https://fcm.googleapis.com/fcm/send/test"]))
      .toEqual({ enviados: 0, invalidos: [], falhas: 1 });
    expect(envio).toHaveBeenCalledTimes(1);
  });
});
