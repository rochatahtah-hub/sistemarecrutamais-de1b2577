/** Derivação e verificação do PIN administrativo (PBKDF2-SHA256, nunca em texto). */
const ITERACOES = 120_000;

function b64(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function debase64(txt: string) {
  return Uint8Array.from(atob(txt), (c) => c.charCodeAt(0));
}

async function derivar(pin: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, [
    "deriveBits",
  ]);
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as unknown as BufferSource, iterations: ITERACOES },
    base,
    256,
  );
}

export async function gerarHashPin(pin: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await derivar(pin, salt);
  return `pbkdf2$${ITERACOES}$${b64(salt.buffer as ArrayBuffer)}$${b64(bits)}`;
}

export async function conferirPin(pin: string, hash: string) {
  const partes = hash.split("$");
  if (partes.length !== 4) return false;
  const salt = debase64(partes[2]!);
  const bits = await derivar(pin, salt);
  const a = new Uint8Array(bits);
  const b = debase64(partes[3]!);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export function pinValido(pin: string) {
  return /^\d{4,8}$/.test(pin);
}
