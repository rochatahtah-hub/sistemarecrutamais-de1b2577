import type { Metas, VagaRegistro } from "./tipos";
import {
  agregar,
  agregarPor,
  serieTemporal,
  variacao,
  type Agregado,
  type LinhaAgregada,
} from "./metricas";

export interface LinhaPerformance extends LinhaAgregada {
  taxaConfirmacao: number;
  indice: number;
}

/**
 * Índice de performance equilibrado (0–100): valoriza qualidade (presença),
 * conversão (vagas confirmadas) e volume relativo, penalizando faltas.
 */
export function rankingPerformance(registros: VagaRegistro[]): LinhaPerformance[] {
  const linhas = agregarPor(registros, "colaborador");
  const maiorVolume = Math.max(1, ...linhas.map((l) => l.vagas));
  return linhas
    .map((l) => {
      const taxaConfirmacao = l.vagas > 0 ? (l.confirmadas / l.vagas) * 100 : 0;
      const volume = (l.vagas / maiorVolume) * 100;
      const indice = Math.max(
        0,
        Math.min(
          100,
          l.pctPresenca * 0.5 + taxaConfirmacao * 0.2 + volume * 0.3 - l.pctFalta * 0.1,
        ),
      );
      return { ...l, taxaConfirmacao, indice };
    })
    .sort((a, b) => b.indice - a.indice || b.presencas - a.presencas);
}

export interface Insight {
  id: string;
  severidade: "critico" | "atencao" | "positivo";
  escopo: "geral" | "empresa" | "colaborador" | "vaga" | "periodo";
  titulo: string;
  descricao: string;
  indicador: string;
  variacao?: number;
  alvo?: string;
}

function fmt(n: number) {
  return `${n > 0 ? "+" : ""}${n.toFixed(1).replace(".", ",")}%`;
}

function periodoAtualAnterior(registros: VagaRegistro[]) {
  const serie = serieTemporal(registros, "quinzena");
  if (serie.length < 2) return null;
  const atual = serie[serie.length - 1]!;
  const anterior = serie[serie.length - 2]!;
  const chaveAtual = atual.chave;
  const chaveAnterior = anterior.chave;
  const daChave = (chave: string) =>
    registros.filter((r) => {
      const [ano, mes, dia] = r.data.split("-");
      return `${ano}-${mes}-${Number(dia) <= 15 ? "Q1" : "Q2"}` === chave;
    });
  return {
    atual,
    anterior,
    registrosAtual: daChave(chaveAtual),
    registrosAnterior: daChave(chaveAnterior),
  };
}

/** Análise automática comparando o período atual com o anterior. */
export function gerarInsights(registros: VagaRegistro[], metas: Metas): Insight[] {
  const insights: Insight[] = [];
  if (registros.length === 0) return insights;

  const comparacao = periodoAtualAnterior(registros);
  const minimo = 5;

  if (comparacao) {
    const { atual, anterior, registrosAtual, registrosAnterior } = comparacao;
    const rotulo = `${anterior.periodo} → ${atual.periodo}`;

    const varFaltas = atual.pctFalta - anterior.pctFalta;
    if (Math.abs(varFaltas) >= 3) {
      insights.push({
        id: "geral-faltas",
        severidade: varFaltas > 0 ? "critico" : "positivo",
        escopo: "geral",
        titulo: varFaltas > 0 ? "Taxa de faltas em alta" : "Taxa de faltas em queda",
        descricao: `A taxa de faltas ${varFaltas > 0 ? "aumentou" : "reduziu"} ${Math.abs(varFaltas).toFixed(1).replace(".", ",")} pontos percentuais (${rotulo}).`,
        indicador: "Taxa de faltas",
        variacao: varFaltas,
      });
    }

    const varPresenca = atual.pctPresenca - anterior.pctPresenca;
    if (Math.abs(varPresenca) >= 3) {
      insights.push({
        id: "geral-presenca",
        severidade: varPresenca < 0 ? "atencao" : "positivo",
        escopo: "geral",
        titulo: varPresenca < 0 ? "Redução de presenças" : "Presenças em crescimento",
        descricao: `A taxa de presença variou ${fmt(varPresenca)} em pontos percentuais (${rotulo}).`,
        indicador: "Taxa de presença",
        variacao: varPresenca,
      });
    }

    const varCancel = variacao(atual.cancelamentos, anterior.cancelamentos);
    if (varCancel >= 20) {
      insights.push({
        id: "geral-cancelamentos",
        severidade: "atencao",
        escopo: "geral",
        titulo: "Aumento de cancelamentos",
        descricao: `Cancelamentos subiram ${fmt(varCancel)} (${anterior.cancelamentos} → ${atual.cancelamentos}) em ${rotulo}.`,
        indicador: "Cancelamentos",
        variacao: varCancel,
      });
    }

    const comparar = (campo: "empresa" | "colaborador") => {
      const antes = new Map(agregarPor(registrosAnterior, campo).map((l) => [l.nome, l]));
      for (const atualLinha of agregarPor(registrosAtual, campo)) {
        const antiga = antes.get(atualLinha.nome);
        if (!antiga || atualLinha.confirmadas < minimo || antiga.confirmadas < minimo) continue;
        const delta = atualLinha.pctPresenca - antiga.pctPresenca;
        if (delta <= -10) {
          insights.push({
            id: `${campo}-queda-${atualLinha.nome}`,
            severidade: delta <= -20 ? "critico" : "atencao",
            escopo: campo,
            titulo: `${atualLinha.nome} com queda de desempenho`,
            descricao: `Presença caiu ${Math.abs(delta).toFixed(1).replace(".", ",")} p.p. (${antiga.pctPresenca.toFixed(1)}% → ${atualLinha.pctPresenca.toFixed(1)}%) em ${rotulo}.`,
            indicador: "Taxa de presença",
            variacao: delta,
            alvo: atualLinha.nome,
          });
        } else if (delta >= 10) {
          insights.push({
            id: `${campo}-alta-${atualLinha.nome}`,
            severidade: "positivo",
            escopo: campo,
            titulo: `${atualLinha.nome} acima da média`,
            descricao: `Presença subiu ${delta.toFixed(1).replace(".", ",")} p.p. em ${rotulo}.`,
            indicador: "Taxa de presença",
            variacao: delta,
            alvo: atualLinha.nome,
          });
        }
      }
    };
    comparar("empresa");
    comparar("colaborador");
  }

  const geral: Agregado = agregar(registros);
  for (const e of agregarPor(registros, "empresa")) {
    if (e.confirmadas < minimo) continue;
    if (e.pctFalta > metas.falta + 10) {
      insights.push({
        id: `empresa-falta-${e.nome}`,
        severidade: "critico",
        escopo: "empresa",
        titulo: `${e.nome} com alta taxa de faltas`,
        descricao: `${e.pctFalta.toFixed(1).replace(".", ",")}% de faltas contra ${geral.pctFalta.toFixed(1).replace(".", ",")}% da média geral.`,
        indicador: "Taxa de faltas",
        alvo: e.nome,
      });
    }
    if (e.pctPresenca >= geral.pctPresenca + 10) {
      insights.push({
        id: `empresa-top-${e.nome}`,
        severidade: "positivo",
        escopo: "empresa",
        titulo: `${e.nome} acima da média geral`,
        descricao: `${e.pctPresenca.toFixed(1).replace(".", ",")}% de presença contra ${geral.pctPresenca.toFixed(1).replace(".", ",")}% da média.`,
        indicador: "Taxa de presença",
        alvo: e.nome,
      });
    }
  }

  const porVaga = new Map<string, VagaRegistro[]>();
  for (const r of registros) {
    const nome = r.descricao?.trim() || "Sem descrição";
    const lista = porVaga.get(nome);
    if (lista) lista.push(r);
    else porVaga.set(nome, [r]);
  }
  for (const [nome, lista] of porVaga) {
    if (nome === "Sem descrição") continue;
    const a = agregar(lista);
    if (a.confirmadas >= minimo && a.pctFalta > metas.falta + 10) {
      insights.push({
        id: `vaga-falta-${nome}`,
        severidade: "atencao",
        escopo: "vaga",
        titulo: `Vaga "${nome}" com alta taxa de falta`,
        descricao: `${a.pctFalta.toFixed(1).replace(".", ",")}% de faltas em ${a.confirmadas} confirmações.`,
        indicador: "Taxa de faltas",
        alvo: nome,
      });
    }
    if (a.vagas >= minimo && a.confirmadas / a.vagas < 0.6) {
      insights.push({
        id: `vaga-conversao-${nome}`,
        severidade: "atencao",
        escopo: "vaga",
        titulo: `Vaga "${nome}" com baixa conversão`,
        descricao: `Apenas ${a.confirmadas} de ${a.vagas} vagas foram confirmadas.`,
        indicador: "Conversão",
        alvo: nome,
      });
    }
  }

  const ordem = { critico: 0, atencao: 1, positivo: 2 } as const;
  return insights.sort((a, b) => ordem[a.severidade] - ordem[b.severidade]);
}

export interface AlertaRadar {
  id: string;
  nivel: "vermelho" | "laranja" | "amarelo" | "verde";
  titulo: string;
  detalhe: string;
  itens: string[];
  filtro?: { status?: string; empresa?: string; colaborador?: string };
}

/** Radar da operação: situações reais que precisam de atenção. */
export function gerarRadar(registros: VagaRegistro[], metas: Metas): AlertaRadar[] {
  const alertas: AlertaRadar[] = [];
  if (registros.length === 0) return alertas;
  const hoje = new Date().toISOString().slice(0, 10);
  const minimo = 5;
  const geral = agregar(registros);

  const empresas = agregarPor(registros, "empresa").filter((e) => e.confirmadas >= minimo);

  const vagasFalta = empresas.filter((e) => e.pctFalta > metas.falta + 10);
  if (vagasFalta.length > 0) {
    alertas.push({
      id: "faltas-elevadas",
      nivel: "vermelho",
      titulo: `${vagasFalta.length} empresa(s) com taxa de falta elevada`,
      detalhe: `Acima de ${metas.falta + 10}% de faltas no período filtrado.`,
      itens: vagasFalta.map(
        (e) => `${e.nome} — ${e.pctFalta.toFixed(1).replace(".", ",")}% de faltas`,
      ),
      filtro: { status: "FALTA" },
    });
  }

  const quedaPresenca = empresas.filter((e) => e.pctPresenca < geral.pctPresenca - 10);
  if (quedaPresenca.length > 0) {
    alertas.push({
      id: "queda-presenca",
      nivel: "laranja",
      titulo: `${quedaPresenca.length} empresa(s) com presença abaixo da média`,
      detalhe: `Média geral do período: ${geral.pctPresenca.toFixed(1).replace(".", ",")}% de presença.`,
      itens: quedaPresenca.map(
        (e) => `${e.nome} — ${e.pctPresenca.toFixed(1).replace(".", ",")}% de presença`,
      ),
    });
  }

  const vencidasSemConfirmar = registros.filter(
    (r) => r.status === "AGUARDANDO" && r.data <= hoje,
  );
  if (vencidasSemConfirmar.length > 0) {
    alertas.push({
      id: "sem-confirmacao-vencida",
      nivel: "amarelo",
      titulo: `${vencidasSemConfirmar.length} vaga(s) com data vencida sem confirmação`,
      detalhe: "Registros aguardando presença, falta ou cancelamento.",
      itens: vencidasSemConfirmar
        .slice(0, 12)
        .map((r) => `${r.data.split("-").reverse().join("/")} — ${r.empresa} / ${r.colaborador}`),
      filtro: { status: "AGUARDANDO" },
    });
  }

  const futurasSemConfirmar = registros.filter(
    (r) => r.status === "AGUARDANDO" && r.data > hoje,
  );
  if (futurasSemConfirmar.length > 0) {
    alertas.push({
      id: "sem-confirmacao-futura",
      nivel: "amarelo",
      titulo: `${futurasSemConfirmar.length} candidato(s) sem confirmação`,
      detalhe: "Vagas programadas que ainda aguardam confirmação.",
      itens: futurasSemConfirmar
        .slice(0, 12)
        .map((r) => `${r.data.split("-").reverse().join("/")} — ${r.empresa} / ${r.colaborador}`),
      filtro: { status: "AGUARDANDO" },
    });
  }

  const incompletas = registros.filter(
    (r) => !r.descricao?.trim() || r.empresa === "Não identificada" || r.colaborador === "Não identificado",
  );
  if (incompletas.length > 0) {
    alertas.push({
      id: "dados-incompletos",
      nivel: "laranja",
      titulo: `${incompletas.length} registro(s) com informações incompletas`,
      detalhe: "Falta empresa, colaborador ou descrição da vaga.",
      itens: incompletas
        .slice(0, 12)
        .map((r) => `${r.data.split("-").reverse().join("/")} — ${r.empresa} / ${r.colaborador}`),
    });
  }

  const acimaDaMedia = empresas.filter((e) => e.pctPresenca >= metas.presenca);
  if (acimaDaMedia.length > 0) {
    alertas.push({
      id: "acima-da-media",
      nivel: "verde",
      titulo: `${acimaDaMedia.length} empresa(s) dentro ou acima da meta de presença`,
      detalhe: `Meta configurada: ${metas.presenca}% de presença.`,
      itens: acimaDaMedia.map(
        (e) => `${e.nome} — ${e.pctPresenca.toFixed(1).replace(".", ",")}% de presença`,
      ),
    });
  }

  const ordem = { vermelho: 0, laranja: 1, amarelo: 2, verde: 3 } as const;
  return alertas.sort((a, b) => ordem[a.nivel] - ordem[b.nivel]);
}