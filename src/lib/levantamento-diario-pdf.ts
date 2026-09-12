import type { jsPDF } from "jspdf";
import { fmtData, fmtNum, fmtPct } from "./metricas";
import type {
  LevantamentoDiarioProgramador,
  LevantamentoDiarioResumo,
} from "./levantamento-diario";

/** DD-MM-AAAA — nome de arquivo pedido: Levantamento_Diario_DD-MM-AAAA.pdf */
function dataParaArquivo(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}-${m}-${a}`;
}

const PRETO = [20, 20, 22] as const;
const DOURADO = [212, 175, 55] as const;
const CABECALHO = {
  fillColor: [30, 30, 33] as [number, number, number],
  textColor: [212, 175, 55] as [number, number, number],
};

type DocPdf = jsPDF;

/** Captura um elemento do DOM já renderizado (gráfico recharts) e devolve a
 * altura ocupada, para encadear o próximo elemento logo abaixo. */
async function desenharGrafico(
  doc: DocPdf,
  elemento: HTMLElement | null,
  y: number,
  largura: number,
) {
  if (!elemento) return y;
  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(elemento, { backgroundColor: "#ffffff", scale: 2 });
  const altura = (canvas.height / canvas.width) * largura;
  const alturaPagina = doc.internal.pageSize.getHeight();
  if (y + altura > alturaPagina - 40) {
    doc.addPage();
    y = 40;
  }
  doc.addImage(canvas.toDataURL("image/png"), "PNG", 40, y, largura, altura);
  return y + altura + 20;
}

const RANKINGS: Array<{
  chave: "vagas" | "pctPresenca" | "pctFalta" | "pctCancelamento";
  titulo: string;
}> = [
  { chave: "vagas", titulo: "Ranking — Vagas adicionadas" },
  { chave: "pctPresenca", titulo: "Ranking — % Presença" },
  { chave: "pctFalta", titulo: "Ranking — % Falta" },
  { chave: "pctCancelamento", titulo: "Ranking — % Cancelamento" },
];

function valorLinha(
  l: LevantamentoDiarioProgramador,
  chave: (typeof RANKINGS)[number]["chave"],
): number {
  if (chave === "vagas") return l.vagasFechadas;
  if (chave === "pctPresenca") return l.pctPresenca;
  if (chave === "pctFalta") return l.pctFalta;
  return l.pctCancelamento;
}

/**
 * PDF do Levantamento Diário — mesma identidade visual (header preto/dourado,
 * jspdf-autotable) já usada em `exportar.ts`. Todo número vem das mesmas
 * linhas persistidas exibidas na tela (`resumo`/`porProgramador`), nunca
 * recalculado aqui — garante que tabela, gráfico e PDF nunca divirjam.
 */
export async function exportarLevantamentoDiarioPdf(opcoes: {
  resumo: LevantamentoDiarioResumo;
  porProgramador: LevantamentoDiarioProgramador[];
  graficoPizza: HTMLElement | null;
  graficosBarra: Record<(typeof RANKINGS)[number]["chave"], HTMLElement | null>;
}) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const { resumo, porProgramador } = opcoes;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const largura = doc.internal.pageSize.getWidth();
  const larguraUtil = largura - 80;

  doc.setFillColor(...PRETO);
  doc.rect(0, 0, largura, 90, "F");
  doc.setTextColor(...DOURADO);
  doc.setFontSize(20);
  doc.text("Levantamento Diário de Vagas", 40, 45);
  doc.setFontSize(10);
  doc.setTextColor(220, 220, 220);
  doc.text(`Data analisada: ${fmtData(resumo.dataReferencia)}`, 40, 66);
  doc.text(
    `Gerado em ${new Date(resumo.geradoEm).toLocaleString("pt-BR")}` +
      (resumo.vezesReprocessado > 0
        ? ` — reprocessado ${resumo.vezesReprocessado}x, última vez por ${resumo.reprocessadoPorNome}`
        : ""),
    40,
    80,
  );

  autoTable(doc, {
    startY: 110,
    head: [["Indicador", "Quantidade", "Percentual"]],
    body: [
      ["Vagas adicionadas", fmtNum(resumo.vagasFechadas), "—"],
      ["Aguardando confirmação", fmtNum(resumo.pendentes), "—"],
      ["Presenças", fmtNum(resumo.presencas), fmtPct(resumo.pctPresenca)],
      ["Faltas", fmtNum(resumo.faltas), fmtPct(resumo.pctFalta)],
      ["Cancelamentos", fmtNum(resumo.cancelamentos), fmtPct(resumo.pctCancelamento)],
    ],
    headStyles: CABECALHO,
    styles: { fontSize: 10 },
  });

  const finalTabelaResumo = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
    .finalY;
  await desenharGrafico(doc, opcoes.graficoPizza, finalTabelaResumo + 20, larguraUtil);

  doc.addPage();
  autoTable(doc, {
    startY: 40,
    head: [
      [
        "Programador",
        "Vagas adicionadas",
        "Aguardando",
        "Presenças",
        "Faltas",
        "Cancel.",
        "% Pres.",
        "% Falta",
        "% Cancel.",
      ],
    ],
    body: porProgramador.map((l) => [
      l.nome,
      fmtNum(l.vagasFechadas),
      fmtNum(l.pendentes),
      fmtNum(l.presencas),
      fmtNum(l.faltas),
      fmtNum(l.cancelamentos),
      fmtPct(l.pctPresenca),
      fmtPct(l.pctFalta),
      fmtPct(l.pctCancelamento),
    ]),
    headStyles: CABECALHO,
    styles: { fontSize: 9 },
  });

  for (const ranking of RANKINGS) {
    const ordenado = [...porProgramador].sort(
      (a, b) => valorLinha(a, ranking.chave) - valorLinha(b, ranking.chave),
    );
    doc.addPage();
    autoTable(doc, {
      startY: 40,
      head: [[ranking.titulo, "Valor"]],
      body: ordenado.map((l) => [
        l.nome,
        ranking.chave === "vagas" ? fmtNum(l.vagasFechadas) : fmtPct(valorLinha(l, ranking.chave)),
      ]),
      headStyles: CABECALHO,
      styles: { fontSize: 9 },
    });
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    await desenharGrafico(doc, opcoes.graficosBarra[ranking.chave], finalY + 20, larguraUtil);
  }

  doc.save(`Levantamento_Diario_${dataParaArquivo(resumo.dataReferencia)}.pdf`);
}
