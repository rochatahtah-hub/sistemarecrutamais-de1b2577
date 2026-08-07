import type { VagaRegistro } from "./tipos";
import { STATUS_LABEL } from "./tipos";
import {
  agregar,
  agregarPor,
  fmtData,
  fmtNum,
  fmtPct,
  gerarAlertas,
  type Alerta,
} from "./metricas";
import type { Metas } from "./tipos";

export async function exportarExcel(registros: VagaRegistro[], nomeArquivo = "relatorio-vagas") {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const detalhe = registros.map((r) => ({
    Data: fmtData(r.data),
    Colaborador: r.colaborador,
    Empresa: r.empresa,
    Vaga: r.descricao,
    Quantidade: r.quantidade,
    Status: STATUS_LABEL[r.status] ?? r.status,
    Observação: r.observacao,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalhe), "Vagas");

  const t = agregar(registros);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      {
        "Vagas fechadas": t.vagas,
        Presenças: t.presencas,
        Faltas: t.faltas,
        Cancelamentos: t.cancelamentos,
        "% Presença": Number(t.pctPresenca.toFixed(1)),
        "% Falta": Number(t.pctFalta.toFixed(1)),
        "% Cancelamento": Number(t.pctCancelamento.toFixed(1)),
      },
    ]),
    "Resumo",
  );

  for (const [titulo, campo] of [
    ["Colaboradores", "colaborador"],
    ["Empresas", "empresa"],
  ] as const) {
    const linhas = agregarPor(registros, campo).map((l) => ({
      Nome: l.nome,
      Vagas: l.vagas,
      Presenças: l.presencas,
      Faltas: l.faltas,
      Cancelamentos: l.cancelamentos,
      "% Presença": Number(l.pctPresenca.toFixed(1)),
      "% Falta": Number(l.pctFalta.toFixed(1)),
      "% Cancelamento": Number(l.pctCancelamento.toFixed(1)),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas), titulo);
  }

  XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
}

export async function exportarPdf(
  registros: VagaRegistro[],
  periodo: string,
  metas: Metas,
  nomeArquivo = "relatorio-vagas",
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const largura = doc.internal.pageSize.getWidth();
  const t = agregar(registros);

  doc.setFillColor(20, 20, 22);
  doc.rect(0, 0, largura, 90, "F");
  doc.setTextColor(212, 175, 55);
  doc.setFontSize(20);
  doc.text("Relatório de Gestão de Vagas", 40, 45);
  doc.setFontSize(10);
  doc.setTextColor(220, 220, 220);
  doc.text(`Período analisado: ${periodo}`, 40, 66);
  doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, 40, 80);

  autoTable(doc, {
    startY: 110,
    head: [["Indicador", "Quantidade", "Percentual"]],
    body: [
      ["Vagas fechadas", fmtNum(t.vagas), "100%"],
      ["Presenças", fmtNum(t.presencas), fmtPct(t.pctPresenca)],
      ["Faltas", fmtNum(t.faltas), fmtPct(t.pctFalta)],
      ["Cancelamentos", fmtNum(t.cancelamentos), fmtPct(t.pctCancelamento)],
    ],
    headStyles: { fillColor: [30, 30, 33], textColor: [212, 175, 55] },
    styles: { fontSize: 10 },
  });

  const secao = (titulo: string, linhas: string[][]) => {
    autoTable(doc, {
      head: [[titulo, "Vagas", "Presenças", "Faltas", "Cancel.", "% Pres.", "% Falta"]],
      body: linhas,
      headStyles: { fillColor: [30, 30, 33], textColor: [212, 175, 55] },
      styles: { fontSize: 9 },
      margin: { top: 20 },
    });
  };

  secao(
    "Ranking de colaboradores",
    agregarPor(registros, "colaborador")
      .slice(0, 15)
      .map((l) => [
        l.nome,
        fmtNum(l.vagas),
        fmtNum(l.presencas),
        fmtNum(l.faltas),
        fmtNum(l.cancelamentos),
        fmtPct(l.pctPresenca),
        fmtPct(l.pctFalta),
      ]),
  );

  secao(
    "Ranking de empresas",
    agregarPor(registros, "empresa")
      .slice(0, 15)
      .map((l) => [
        l.nome,
        fmtNum(l.vagas),
        fmtNum(l.presencas),
        fmtNum(l.faltas),
        fmtNum(l.cancelamentos),
        fmtPct(l.pctPresenca),
        fmtPct(l.pctFalta),
      ]),
  );

  const alertas: Alerta[] = gerarAlertas(registros, metas).slice(0, 12);
  if (alertas.length > 0) {
    autoTable(doc, {
      head: [["Alertas gerenciais", "Detalhe"]],
      body: alertas.map((a) => [a.titulo, a.descricao]),
      headStyles: { fillColor: [30, 30, 33], textColor: [212, 175, 55] },
      styles: { fontSize: 9 },
    });
  }

  doc.save(`${nomeArquivo}.pdf`);
}