import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Primeiro nome de uma pessoa, para uso apenas visual (gráficos e rótulos).
 * Nunca deve ser usado como identificador — o banco continua com o nome completo.
 */
export function primeiroNome(nome: string | null | undefined): string {
  const limpo = (nome ?? "")
    // remove emojis e símbolos decorativos usados nos apelidos
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\u2190-\u2BFF\uFE0F\u200D]/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
  if (!limpo) return "";
  return limpo.split(" ")[0] ?? "";
}
