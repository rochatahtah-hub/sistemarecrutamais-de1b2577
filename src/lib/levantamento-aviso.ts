export function mensagemLevantamentoPronto(nome: string, tipo: "diario" | "quinzena") {
  return `Olá ${nome.trim() || "Administrador"}, o levantamento ${tipo === "diario" ? "diário" : "da quinzena"} já está pronto.`;
}

export function periodoCompleto(datas: string[], inicio: string, fim: string) {
  const presentes = new Set(datas);
  const ultimo = new Date(`${fim}T00:00:00Z`).getTime();
  let atual = new Date(`${inicio}T00:00:00Z`).getTime();
  if (!Number.isFinite(atual) || !Number.isFinite(ultimo) || atual > ultimo) return false;
  for (; atual <= ultimo; atual += 86400000) {
    if (!presentes.has(new Date(atual).toISOString().slice(0, 10))) return false;
  }
  return true;
}