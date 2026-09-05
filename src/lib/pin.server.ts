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

/** Regra de ENTRADA: mesmo mínimo exigido para cadastrar um PIN novo (6 a 10 dígitos). */
export function pinValido(pin: string) {
  return /^\d{6,10}$/.test(pin);
}

/** Regra para PINs NOVOS: mínimo de 6 dígitos e sem sequências/repetições óbvias. */
export function pinForteValido(pin: string) {
  if (!/^\d{6,10}$/.test(pin)) return false;
  if (/^(\d)\1+$/.test(pin)) return false; // 000000, 111111...
  const cresce = pin.split("").every((d, i, a) => i === 0 || Number(d) === Number(a[i - 1]) + 1);
  const decresce = pin.split("").every((d, i, a) => i === 0 || Number(d) === Number(a[i - 1]) - 1);
  return !cresce && !decresce;
}

/** Espera exponencial após o limite de tentativas: 15min, 30, 60, 120... até 24h. */
export function esperaMinutos(falhas: number, maxFalhas: number, baseMin: number) {
  const excedente = Math.max(0, falhas - maxFalhas);
  return Math.min(baseMin * 2 ** excedente, 24 * 60);
}
