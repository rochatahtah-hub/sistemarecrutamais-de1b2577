import { MAPEAMENTO_PADRAO, normalizarTexto, resolverStatus, type MapeamentoStatus } from "./tipos";

export type CampoDestino =
  | "data"
  | "colaborador"
  | "empresa"
  | "descricao"
  | "quantidade"
  | "status"
  | "observacao";

export const CAMPOS: { campo: CampoDestino; label: string; obrigatorio: boolean; pistas: string[] }[] = [
  { campo: "data", label: "Data", obrigatorio: true, pistas: ["data", "dia", "date", "periodo"] },
  {
    campo: "colaborador",
    label: "Colaborador / Recrutador",
    obrigatorio: false,
    pistas: ["colaborador", "recrutador", "responsavel", "consultor", "analista", "usuario"],
  },
  {
    campo: "empresa",
    label: "Empresa",
    obrigatorio: true,
    pistas: ["empresa", "cliente", "unidade", "contratante"],
  },
  {
    campo: "descricao",
    label: "Vaga / Cargo",
    obrigatorio: true,
    pistas: ["vaga", "cargo", "funcao", "posicao", "descricao"],
  },
  {
    campo: "quantidade",
    label: "Quantidade de vagas",
    obrigatorio: false,
    pistas: ["quantidade", "qtd", "qtde", "vagas", "total"],
  },
  {
    campo: "status",
    label: "Confirmação (Status)",
    obrigatorio: true,
    pistas: [
      "confirmacao",
      "confirmação",
      "confirmado",
      "status",
      "situacao",
      "resultado",
      "presenca",
      "comparecimento",
    ],
  },
  {
    campo: "observacao",
    label: "Observação",
    obrigatorio: false,
    pistas: ["observacao", "obs", "comentario", "nota"],
  },
];

export type Mapeamento = Partial<Record<CampoDestino, string>>;

export function detectarColunas(cabecalhos: string[]): Mapeamento {
  const mapa: Mapeamento = {};
  // A área "CONFIRMAÇÃO" tem prioridade absoluta como fonte de presença/falta/cancelamento.
  const confirmacao = cabecalhos.find((h) => normalizarTexto(h).includes("confirma"));
  if (confirmacao) mapa.status = confirmacao;
  for (const { campo, pistas } of CAMPOS) {
    if (mapa[campo]) continue;
    const achado = cabecalhos.find((h) => {
      const n = normalizarTexto(h);
      return pistas.some((p) => n === p || n.includes(p));
    });
    if (achado) mapa[campo] = achado;
  }
  return mapa;
}

/** Retorna a coluna usada como área "CONFIRMAÇÃO", quando existir. */
export function colunaConfirmacao(mapa: Mapeamento): string | null {
  const col = mapa.status;
  return col && normalizarTexto(col).includes("confirma") ? col : null;
}

/** Campos que uma aba precisa ter para ser importada (colaborador vem do nome da aba). */
export function camposFaltando(mapa: Mapeamento) {
  return CAMPOS.filter((c) => c.obrigatorio && !mapa[c.campo]);
}

export function converterData(valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === "") return null;
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor.toISOString().slice(0, 10);
  }
  if (typeof valor === "number" && Number.isFinite(valor)) {
    // serial do Excel (base 30/12/1899)
    const ms = Math.round((valor - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  const texto = String(valor).trim();
  const br = texto.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (br) {
    const dia = br[1]!.padStart(2, "0");
    const mes = br[2]!.padStart(2, "0");
    let ano = br[3]!;
    if (ano.length === 2) ano = `20${ano}`;
    const iso = `${ano}-${mes}-${dia}`;
    return Number.isNaN(new Date(iso).getTime()) ? null : iso;
  }
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const parsed = new Date(texto);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

export interface LinhaProcessada {
  linha: number;
  aba: string;
  data: string | null;
  colaborador: string;
  empresa: string;
  descricao: string;
  quantidade: number;
  status: string | null;
  observacao: string;
  hash: string;
  problemas: string[];
  duplicada: boolean;
}

export function processarLinhas(
  linhas: Record<string, unknown>[],
  mapa: Mapeamento,
  mapeamentoStatus: MapeamentoStatus = MAPEAMENTO_PADRAO,
  opcoes: { aba?: string; colaboradorPadrao?: string; vistos?: Set<string> } = {},
): LinhaProcessada[] {
  const vistos = opcoes.vistos ?? new Set<string>();
  return linhas.map((bruta, i) => {
    const pegar = (campo: CampoDestino) => {
      const coluna = mapa[campo];
      return coluna ? bruta[coluna] : undefined;
    };
    const problemas: string[] = [];

    const data = converterData(pegar("data"));
    if (!data) problemas.push("Data inválida ou ausente");

    const colaborador =
      String(pegar("colaborador") ?? "").trim() || (opcoes.colaboradorPadrao ?? "").trim();
    if (!colaborador) problemas.push("Colaborador não identificado");

    const empresa = String(pegar("empresa") ?? "").trim();
    if (!empresa) problemas.push("Empresa não identificada");

    const statusBruto = pegar("status");
    const status = resolverStatus(statusBruto, mapeamentoStatus);
    if (!status) problemas.push(`Status desconhecido: "${String(statusBruto ?? "")}"`);

    const qtdBruta = pegar("quantidade");
    let quantidade = qtdBruta === undefined || qtdBruta === "" ? 1 : Number(qtdBruta);
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      problemas.push("Quantidade inválida");
      quantidade = 1;
    }

    const descricao = String(pegar("descricao") ?? "").trim();
    const observacao = String(pegar("observacao") ?? "").trim();

    const hash = [data, normalizarTexto(colaborador), normalizarTexto(empresa), normalizarTexto(descricao), status, quantidade].join("|");
    const duplicada = vistos.has(hash);
    if (!duplicada) vistos.add(hash);

    return {
      linha: i + 2,
      aba: opcoes.aba ?? "",
      data,
      colaborador,
      empresa,
      descricao,
      quantidade,
      status,
      observacao,
      hash,
      problemas,
      duplicada,
    };
  });
}