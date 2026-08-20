/**
 * Escapa valores para CSV neutralizando fórmulas de planilha.
 *
 * Textos vindos de formulários públicos (nome, cidade, função...) podem começar
 * com =, +, -, @, tab ou retorno de carro. Excel/Google Sheets interpretariam
 * esses valores como fórmula ao abrir o arquivo exportado. Prefixamos com uma
 * apóstrofe para que sejam sempre tratados como texto simples.
 */
export function neutralizarFormula(texto: string): string {
  return /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
}

/** Converte qualquer valor em um texto seguro para uma célula CSV (sem aspas externas). */
export function textoCelulaCsv(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  const texto = typeof valor === "object" ? JSON.stringify(valor) : String(valor);
  return neutralizarFormula(texto);
}

/** Célula CSV já entre aspas, com escape de aspas internas e fórmulas neutralizadas. */
export function celulaCsv(valor: unknown): string {
  return `"${textoCelulaCsv(valor).replace(/"/g, '""')}"`;
}
