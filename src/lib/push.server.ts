/**
 * Envio de aviso de nova vaga por Web Push.
 *
 * Decisão central: o aviso vai SEM conteúdo. O texto que a pessoa vê é fixo e
 * mora dentro do service worker. Isso tem duas consequências boas:
 *
 *   1. Privacidade — nada sobre a vaga, a empresa ou a pessoa trafega até o
 *      serviço de push nem aparece na tela bloqueada do celular.
 *   2. Simplicidade — sem payload não existe a criptografia aes128gcm do
 *      RFC 8291, que é a parte mais fácil de errar em silêncio. Resta apenas
 *      a autenticação VAPID (um JWT ES256), feita aqui com WebCrypto, que é o
 *      que roda no Cloudflare Workers (a biblioteca `web-push` é de Node e não
 *      funciona neste runtime).
 *
 * Chaves: `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` vêm do ambiente. A privada
 * nunca sai daqui e nunca é versionada.
 */

function base64UrlParaBytes(valor: string): Uint8Array {
  const base64 = valor.replace(/-/g, "+").replace(/_/g, "/");
  const preenchido = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binario = atob(preenchido);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

function bytesParaBase64Url(bytes: Uint8Array): string {
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function textoParaBase64Url(texto: string): string {
  return bytesParaBase64Url(new TextEncoder().encode(texto));
}

/**
 * A chave privada VAPID é distribuída como o escalar d em base64url (32 bytes).
 * O WebCrypto só importa P-256 em JWK ou PKCS8 — aqui montamos o JWK, o que
 * exige também as coordenadas x/y, que saem da chave pública (65 bytes,
 * formato não comprimido: 0x04 || x || y).
 */
async function importarChavePrivada(privadaB64: string, publicaB64: string): Promise<CryptoKey> {
  const publica = base64UrlParaBytes(publicaB64);
  if (publica.length !== 65 || publica[0] !== 0x04) {
    throw new Error("VAPID_PUBLIC_KEY inválida: esperado 65 bytes não comprimidos.");
  }
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    d: privadaB64.replace(/-/g, "-").replace(/=+$/, ""),
    x: bytesParaBase64Url(publica.slice(1, 33)),
    y: bytesParaBase64Url(publica.slice(33, 65)),
    ext: true,
  };
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, [
    "sign",
  ]);
}

/** Cabeçalho Authorization do esquema VAPID para um endpoint. Exportado para
 * que o teste consiga conferir a assinatura com uma verificação independente. */
export async function cabecalhoVapid(
  endpoint: string,
  publica: string,
  privada: string,
  contato: string,
) {
  const aud = new URL(endpoint).origin;
  const cabecalho = textoParaBase64Url(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const corpo = textoParaBase64Url(
    JSON.stringify({
      aud,
      exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
      sub: contato,
    }),
  );
  const aAssinar = `${cabecalho}.${corpo}`;
  const chave = await importarChavePrivada(privada, publica);
  // O WebCrypto devolve a assinatura ECDSA já no formato cru r||s (64 bytes),
  // que é exatamente o que o JWS espera — não precisa converter de DER.
  const assinatura = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    chave,
    new TextEncoder().encode(aAssinar),
  );
  const jwt = `${aAssinar}.${bytesParaBase64Url(new Uint8Array(assinatura))}`;
  return `vapid t=${jwt}, k=${publica.replace(/=+$/, "")}`;
}

export interface ResultadoEnvio {
  enviados: number;
  invalidos: string[];
  falhas: number;
}

/**
 * Dispara o aviso para uma lista de endpoints. Falha de um endereço nunca
 * derruba os outros nem interrompe quem chamou: endereços que o serviço de
 * push recusa em definitivo (404/410) voltam em `invalidos` para serem
 * marcados e não tentados de novo.
 */
export async function enviarAvisoPush(endpoints: string[]): Promise<ResultadoEnvio> {
  const publica = process.env["VAPID_PUBLIC_KEY"];
  const privada = process.env["VAPID_PRIVATE_KEY"];
  const contato = process.env["VAPID_CONTATO"] ?? "mailto:contato@recrutamaisrh.ia.br";
  if (!publica || !privada) {
    console.error("[push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY ausentes: nenhum aviso enviado.");
    return { enviados: 0, invalidos: [], falhas: endpoints.length };
  }

  let enviados = 0;
  let falhas = 0;
  const invalidos: string[] = [];

  for (const endpoint of endpoints) {
    try {
      const resposta = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: await cabecalhoVapid(endpoint, publica, privada, contato),
          TTL: "86400",
          // Sem corpo: o texto do aviso é fixo, no service worker.
          "Content-Length": "0",
        },
      });
      if (resposta.ok) {
        enviados++;
      } else if (resposta.status === 404 || resposta.status === 410) {
        // Inscrição morta (app desinstalado, navegador limpou): não insistir.
        invalidos.push(endpoint);
      } else {
        falhas++;
        console.error(`[push] envio recusado (${resposta.status})`);
      }
    } catch (e) {
      falhas++;
      // Sem detalhe de endpoint no log: é endereço de dispositivo de alguém.
      console.error(
        "[push] falha de rede no envio:",
        e instanceof Error ? e.message : "desconhecida",
      );
    }
  }

  return { enviados, invalidos, falhas };
}
