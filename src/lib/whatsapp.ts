/**
 * Link direto para o WhatsApp a partir de um telefone cadastrado.
 * A normalização é apenas para montar a URL — o telefone salvo no banco não muda.
 */
export function normalizarWhatsApp(telefone: string | null | undefined): string | null {
  let digitos = (telefone ?? "").replace(/\D+/g, "");
  if (!digitos) return null;
  // Remove zeros de discagem nacional (ex.: 0 47 ...).
  digitos = digitos.replace(/^0+/, "");
  // Não duplicar o código do Brasil quando já vier cadastrado.
  if (digitos.length > 11 && digitos.startsWith("55")) digitos = digitos.slice(2);
  // Números válidos no Brasil: DDD (2) + 8 ou 9 dígitos.
  if (digitos.length !== 10 && digitos.length !== 11) return null;
  const ddd = Number(digitos.slice(0, 2));
  if (ddd < 11 || ddd > 99) return null;
  return `55${digitos}`;
}

export function linkWhatsApp(telefone: string | null | undefined): string | null {
  const numero = normalizarWhatsApp(telefone);
  return numero ? `https://wa.me/${numero}` : null;
}
