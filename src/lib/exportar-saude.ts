import type { ErroSistema } from "./system-health";

const dataHora = (valor: string) => new Date(valor).toLocaleString("pt-BR");
const origem = (e: ErroSistema) => e.componente || e.pagina || "Aplicação";

export interface ResumoEndpoint {
  endpoint: string;
  codigos: string;
  ocorrencias: number;
  ultima: string;
}

export function agruparEndpoints(erros: ErroSistema[]): ResumoEndpoint[] {
  const mapa = new Map<string, { codigos: Set<string>; ocorrencias: number; ultima: number }>();
  for (const e of erros) {
    const chave = e.endpoint || "(sem endpoint)";
    const atual = mapa.get(chave) ?? { codigos: new Set<string>(), ocorrencias: 0, ultima: 0 };
    if (e.codigo_http) atual.codigos.add(String(e.codigo_http));
    atual.ocorrencias += e.ocorrencias;
    atual.ultima = Math.max(atual.ultima, new Date(e.ultima_ocorrencia).getTime());
    mapa.set(chave, atual);
  }
  return [...mapa.entries()]
    .map(([endpoint, v]) => ({
      endpoint,
      codigos: [...v.codigos].sort().join(", ") || "—",
      ocorrencias: v.ocorrencias,
      ultima: new Date(v.ultima).toLocaleString("pt-BR"),
    }))
    .sort((a, b) => b.ocorrencias - a.ocorrencias);
}

export function estatisticasSaude(erros: ErroSistema[]) {
  const total = erros.reduce((s, e) => s + e.ocorrencias, 0);
  const porCategoria = new Map<string, number>();
  const porCodigo = new Map<string, number>();
  for (const e of erros) {
    porCategoria.set(e.categoria, (porCategoria.get(e.categoria) ?? 0) + e.ocorrencias);
    const cod = e.codigo_http ? String(e.codigo_http) : "sem código";
    porCodigo.set(cod, (porCodigo.get(cod) ?? 0) + e.ocorrencias);
  }
  const ordenar = (m: Map<string, number>) =>
    [...m.entries()].map(([nome, ocorrencias]) => ({ nome, ocorrencias })).sort((a, b) => b.ocorrencias - a.ocorrencias);
  return {
    total,
    distintas: erros.length,
    naoAutorizados: erros.filter((e) => e.codigo_http === 401).reduce((s, e) => s + e.ocorrencias, 0),
    porCategoria: ordenar(porCategoria),
    porCodigo: ordenar(porCodigo),
  };
}

export async function exportarSaudeExcel(erros: ErroSistema[], nomeArquivo = "saude-do-sistema") {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const stats = estatisticasSaude(erros);

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      {
        "Emitido em": new Date().toLocaleString("pt-BR"),
        "Ocorrências totais": stats.total,
        "Falhas distintas": stats.distintas,
        "Erros 401": stats.naoAutorizados,
      },
    ]),
    "Resumo",
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      erros.map((e) => ({
        "Primeira ocorrência": dataHora(e.primeira_ocorrencia),
        "Última ocorrência": dataHora(e.ultima_ocorrencia),
        Origem: origem(e),
        Operação: e.operacao,
        Categoria: e.categoria,
        "HTTP": e.codigo_http ?? "",
        Endpoint: e.endpoint,
        Mensagem: e.mensagem,
        Navegador: e.navegador,
        "Sistema operacional": e.sistema_operacional,
        Ocorrências: e.ocorrencias,
      })),
    ),
    "Erros recentes",
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      agruparEndpoints(erros).map((l) => ({
        Endpoint: l.endpoint,
        "Códigos HTTP": l.codigos,
        Ocorrências: l.ocorrencias,
        "Última ocorrência": l.ultima,
      })),
    ),
    "Endpoints com falhas",
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      ...stats.porCategoria.map((l) => ({ Tipo: "Categoria", Item: l.nome, Ocorrências: l.ocorrencias })),
      ...stats.porCodigo.map((l) => ({ Tipo: "Código HTTP", Item: l.nome, Ocorrências: l.ocorrencias })),
    ]),
    "Estatísticas",
  );

  XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
}

export async function exportarSaudePDF(erros: ErroSistema[], nomeArquivo = "saude-do-sistema") {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const largura = doc.internal.pageSize.getWidth();
  const stats = estatisticasSaude(erros);

  doc.setFillColor(20, 20, 22);
  doc.rect(0, 0, largura, 90, "F");
  doc.setTextColor(212, 175, 55);
  doc.setFontSize(20);
  doc.text("Saúde do Sistema", 40, 45);
  doc.setFontSize(10);
  doc.setTextColor(220, 220, 220);
  doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, 40, 70);

  const cabecalho = { fillColor: [30, 30, 33] as [number, number, number], textColor: [212, 175, 55] as [number, number, number] };

  autoTable(doc, {
    startY: 110,
    head: [["Indicador", "Valor"]],
    body: [
      ["Ocorrências totais", String(stats.total)],
      ["Falhas distintas", String(stats.distintas)],
      ["Erros 401 (não autorizado)", String(stats.naoAutorizados)],
    ],
    headStyles: cabecalho,
    styles: { fontSize: 10 },
  });

  autoTable(doc, {
    head: [["Endpoint com falhas", "HTTP", "Ocorrências", "Última ocorrência"]],
    body: agruparEndpoints(erros).slice(0, 20).map((l) => [l.endpoint, l.codigos, String(l.ocorrencias), l.ultima]),
    headStyles: cabecalho,
    styles: { fontSize: 9, cellWidth: "wrap" },
    margin: { top: 20 },
  });

  autoTable(doc, {
    head: [["Estatística", "Item", "Ocorrências"]],
    body: [
      ...stats.porCategoria.map((l) => ["Categoria", l.nome, String(l.ocorrencias)]),
      ...stats.porCodigo.map((l) => ["Código HTTP", l.nome, String(l.ocorrencias)]),
    ],
    headStyles: cabecalho,
    styles: { fontSize: 9 },
    margin: { top: 20 },
  });

  autoTable(doc, {
    head: [["Última ocorrência", "Origem", "Falha", "Ambiente", "Total"]],
    body: erros.slice(0, 60).map((e) => [
      dataHora(e.ultima_ocorrencia),
      `${origem(e)}${e.codigo_http ? ` · HTTP ${e.codigo_http}` : ""}`,
      `${e.mensagem}${e.endpoint ? `\n${e.endpoint}` : ""}`,
      `${e.navegador} · ${e.sistema_operacional}`,
      String(e.ocorrencias),
    ]),
    headStyles: cabecalho,
    styles: { fontSize: 8, cellWidth: "wrap" },
    columnStyles: { 2: { cellWidth: 320 } },
    margin: { top: 20 },
  });

  doc.save(`${nomeArquivo}.pdf`);
}
