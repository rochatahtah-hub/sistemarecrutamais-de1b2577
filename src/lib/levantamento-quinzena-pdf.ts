import type { jsPDF } from "jspdf";
import { fmtData, fmtNum, fmtPct } from "./metricas";
import type { QuinzenaConsolidada } from "./levantamento-quinzena";

/** DD-MM-AAAA — nome de arquivo: Levantamento_Quinzena_DD-MM-AAAA_a_DD-MM-AAAA.pdf */
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

/** Normaliza qualquer cor CSS válida (incluindo oklch(), que o html2canvas não
 * sabe interpretar) para "rgb(...)"/"rgba(...)" — usa o próprio navegador via
 * canvas 2D, que aceita e resolve qualquer espaço de cor suportado por ele. */
function normalizarCor(valor: string): string {
  if (!valor || valor === "none" || valor.startsWith("rgb")) return valor;
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return valor;
    ctx.fillStyle = valor;
    return ctx.fillStyle;
  } catch {
    return valor;
  }
}

/** Mesmo tratamento do PDF diário: o tema usa oklch() em toda a paleta e o
 * html2canvas só entende rgb()/hsl(). Reescreve as cores apenas na cópia usada
 * para a captura, sem tocar no DOM real. */
function normalizarCoresDoClone(raiz: HTMLElement) {
  for (const el of [raiz, ...raiz.querySelectorAll<HTMLElement>("*")]) {
    const estilo = getComputedStyle(el);
    el.style.setProperty("color", normalizarCor(estilo.color), "important");
    el.style.setProperty("background-color", normalizarCor(estilo.backgroundColor), "important");
    el.style.setProperty("border-color", normalizarCor(estilo.borderColor), "important");
    if (el instanceof SVGElement) {
      const fill = estilo.fill;
      if (fill && fill !== "none") {
        el.style.setProperty("fill", normalizarCor(fill), "important");
        el.setAttribute("fill", normalizarCor(fill));
      }
      const stroke = estilo.stroke;
      if (stroke && stroke !== "none") {
        el.style.setProperty("stroke", normalizarCor(stroke), "important");
        el.setAttribute("stroke", normalizarCor(stroke));
      }
    }
  }
}

async function desenharGrafico(
  doc: jsPDF,
  elemento: HTMLElement | null,
  y: number,
  largura: number,
) {
  if (!elemento) return y;
  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(elemento, {
    backgroundColor: "#ffffff",
    scale: 2,
    onclone: (_doc, el) => normalizarCoresDoClone(el),
  });
  const altura = (canvas.height / canvas.width) * largura;
  const alturaPagina = doc.internal.pageSize.getHeight();
  if (y + altura > alturaPagina - 40) {
    doc.addPage();
    y = 40;
  }
  doc.addImage(canvas.toDataURL("image/png"), "PNG", 40, y, largura, altura);
  return y + altura + 20;
}

const RANKINGS = [
  { chave: "vagas", titulo: "Ranking — Vagas adicionadas" },
  { chave: "pctPresenca", titulo: "Ranking — % Presença" },
  { chave: "pctFalta", titulo: "Ranking — % Falta" },
  { chave: "pctCancelamento", titulo: "Ranking — % Cancelamento" },
] as const;

type ChaveRanking = (typeof RANKINGS)[number]["chave"];

/**
 * PDF do Levantamento da Quinzena — mesma identidade visual do diário. Todo
 * número vem do mesmo objeto consolidado exibido na tela, nunca recalculado
 * aqui: tela, gráfico e PDF não têm como divergir.
 */
export async function exportarLevantamentoQuinzenaPdf(opcoes: {
  consolidado: QuinzenaConsolidada;
  tituloPeriodo: string;
  graficoPizza: HTMLElement | null;
  graficosBarra: Record<ChaveRanking, HTMLElement | null>;
}) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const { consolidado, tituloPeriodo } = opcoes;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const largura = doc.internal.pageSize.getWidth();
  const larguraUtil = largura - 80;

  doc.setFillColor(...PRETO);
  doc.rect(0, 0, largura, 90, "F");
  doc.setTextColor(...DOURADO);
  doc.setFontSize(20);
  doc.text("Levantamento da Quinzena", 40, 45);
  doc.setFontSize(10);
  doc.setTextColor(220, 220, 220);
  doc.text(
    `${tituloPeriodo} — ${fmtData(consolidado.inicio)} a ${fmtData(consolidado.fim)}`,
    40,
    66,
  );
  doc.text(
    `Gerado em ${new Date().toLocaleString("pt-BR")} — ${consolidado.diasComDados.length} dia(s) com levantamento`,
    40,
    80,
  );

  autoTable(doc, {
    startY: 110,
    head: [["Indicador", "Quantidade", "Percentual"]],
    body: [
      ["Vagas adicionadas", fmtNum(consolidado.totais.vagas), "—"],
      ["Aguardando confirmação", fmtNum(consolidado.totais.pendentes), "—"],
      ["Presenças", fmtNum(consolidado.totais.presencas), fmtPct(consolidado.totais.pctPresenca)],
      ["Faltas", fmtNum(consolidado.totais.faltas), fmtPct(consolidado.totais.pctFalta)],
      [
        "Cancelamentos",
        fmtNum(consolidado.totais.cancelamentos),
        fmtPct(consolidado.totais.pctCancelamento),
      ],
    ],
    headStyles: CABECALHO,
    styles: { fontSize: 10 },
  });

  const finalResumo = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
    .finalY;
  await desenharGrafico(doc, opcoes.graficoPizza, finalResumo + 20, larguraUtil);

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
    body: consolidado.porProgramador.map((l) => [
      l.nome,
      fmtNum(l.vagas),
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

  // Detalhamento dia a dia: mostra como o total de cada programador foi composto.
  for (const linha of consolidado.porProgramador) {
    doc.addPage();
    autoTable(doc, {
      startY: 40,
      head: [[`${linha.nome} — dia a dia`, "Vagas", "Aguard.", "Pres.", "Faltas", "Cancel."]],
      body: [
        ...linha.dias.map((d) => [
          fmtData(d.data),
          fmtNum(d.vagas),
          fmtNum(d.pendentes),
          fmtNum(d.presencas),
          fmtNum(d.faltas),
          fmtNum(d.cancelamentos),
        ]),
        [
          "Total da quinzena",
          fmtNum(linha.vagas),
          fmtNum(linha.pendentes),
          fmtNum(linha.presencas),
          fmtNum(linha.faltas),
          fmtNum(linha.cancelamentos),
        ],
      ],
      headStyles: CABECALHO,
      styles: { fontSize: 9 },
    });
  }

  for (const ranking of RANKINGS) {
    const ordenado = [...consolidado.porProgramador].sort(
      (a, b) => a[ranking.chave] - b[ranking.chave],
    );
    doc.addPage();
    autoTable(doc, {
      startY: 40,
      head: [[ranking.titulo, "Valor"]],
      body: ordenado.map((l) => [
        l.nome,
        ranking.chave === "vagas" ? fmtNum(l.vagas) : fmtPct(l[ranking.chave]),
      ]),
      headStyles: CABECALHO,
      styles: { fontSize: 9 },
    });
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    await desenharGrafico(doc, opcoes.graficosBarra[ranking.chave], finalY + 20, larguraUtil);
  }

  doc.save(
    `Levantamento_Quinzena_${dataParaArquivo(consolidado.inicio)}_a_${dataParaArquivo(consolidado.fim)}.pdf`,
  );
}
