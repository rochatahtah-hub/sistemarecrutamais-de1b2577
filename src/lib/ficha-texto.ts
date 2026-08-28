/** Interpreta a ficha colada e extrai nome, CPF, telefone, Pix e transporte. */
export interface DadosFicha {
  nome: string;
  cpf: string;
  telefone: string;
  /** Chave Pix exatamente como informada na ficha (CPF, e-mail, telefone ou aleatória). */
  pix: string;
  transporte_proprio: boolean;
  transporte_tipos: string[];
  /** Ponto de embarque / observação de deslocamento. */
  transporte_observacao: string;
}


const digitos = (v: string) => v.replace(/\D/g, "");

/** Normaliza o texto colado: remove espaços especiais, unifica quebras de linha. */
function normalizar(texto: string) {
  return (texto ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00a0\u2007\u202f\u200b]/g, " ")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[ \t]+/g, " ");
}

function apos(linhas: string[], rotulos: string[]) {
  for (const r of rotulos) {
    const re = new RegExp(
      `(?:^|\\b)${r}\\s*(?:completo|do candidato|do colaborador)?\\s*[:\\-–=]?\\s*(.*)$`,
      "i",
    );
    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i] ?? "";
      const m = linha.match(re);
      if (!m) continue;
      const valor = (m[1] ?? "").trim();
      if (valor) return valor;
      // rótulo sozinho na linha: usa a próxima linha não vazia
      for (let j = i + 1; j < Math.min(i + 3, linhas.length); j++) {
        const prox = (linhas[j] ?? "").trim();
        if (prox) return prox;
      }
    }
  }
  return "";
}

/**
 * Formata o nome extraído da ficha (ou digitado manualmente) para o padrão do sistema:
 * CAIXA ALTA, espaços normalizados, nome completo preservado (nada é removido/abreviado).
 */
export function formatarNome(nome: string): string {
  return nome.replace(/\s+/g, " ").trim().toLocaleUpperCase("pt-BR");
}

const PALAVRAS_IGNORAR =
  /(ficha|cadastro|candidato|colaborador|empresa|vaga|cargo|endere|bairro|cidade|estado|nascimento|data|rg|pis|ctps|banco|pix|obs|status|função|funcao|setor|sexo|m[ãa]e|pai|e-?mail|telefone|celular|cpf)/i;

export function interpretarFicha(texto: string): DadosFicha {
  const t = normalizar(texto);
  const linhas = t.split("\n").map((linha) => linha.trim());

  let cpf = digitos(apos(linhas, ["cpf", "c\\.p\\.f"]));
  if (cpf.length > 11) cpf = cpf.slice(0, 11);
  if (cpf.length !== 11) {
    const m = t.match(/\d{3}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?\d{2}/);
    cpf = m ? digitos(m[0]).slice(0, 11) : "";
  }
  if (cpf.length !== 11) cpf = "";

  let tel = digitos(
    apos(linhas, [
      "telefone",
      "celular",
      "fone",
      "whatsapp",
      "whats app",
      "whats",
      "contato",
      "tel",
    ]),
  );
  if (tel.startsWith("55") && tel.length > 11) tel = tel.slice(2);
  if (tel.length > 11) tel = tel.slice(0, 11);
  if (tel.length < 10 || tel.length > 11) {
    const semCpf = cpf
      ? t
          .split(
            new RegExp(
              cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1[.\\s]?$2[.\\s]?$3[-.\\s]?$4"),
            ),
          )
          .join(" ")
      : t;
    const m = semCpf
      .match(/(?:\+?55\s?)?\(?\d{2}\)?[\s.-]?9?\d{4}[-\s.]?\d{4}/g)
      ?.map((c) => digitos(c).replace(/^55(?=\d{10,11}$)/, ""))
      .find((d) => d.length >= 10 && d.length <= 11);
    tel = m ? digitos(m) : "";
  }
  if (tel.length < 10) tel = "";

  let nome = apos(linhas, [
    "nome completo",
    "nome do candidato",
    "nome do colaborador",
    "nome",
    "candidato",
    "colaborador",
  ]);
  nome = nome.replace(/[.:;,\-–]+$/, "").trim();
  if (nome && (!/^[A-Za-zÀ-ÿ'´` .]+$/.test(nome) || nome.split(/\s+/).length < 2)) nome = "";
  if (!nome) {
    const linha = linhas.find(
      (l) =>
        /^[A-Za-zÀ-ÿ'´` ]{6,60}$/.test(l) &&
        l.split(/\s+/).length >= 2 &&
        !PALAVRAS_IGNORAR.test(l),
    );
    nome = linha ?? "";
  }
  nome = nome.replace(/\s{2,}/g, " ").trim();
  if (nome) nome = formatarNome(nome);

  const pix = extrairPix(linhas);
  const transporte = extrairTransporte(linhas);

  return { nome, cpf, telefone: tel, pix, ...transporte };
}

/**
 * Chave Pix pelo RÓTULO (nunca pela posição). Aceita CPF, e-mail, telefone e chave
 * aleatória, e mantém o valor exatamente como escrito na ficha (ex.: "CPF 086.723.953-01").
 */
export function extrairPix(linhas: string[]): string {
  const rotulo = /^\s*(?:chave\s*)?pix\b(?:\s*\([^)]*\))?\s*(?:chave)?\s*[:\-–=]?\s*(.*)$/i;
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i] ?? "";
    if (!/pix/i.test(linha)) continue;
    const m = linha.match(rotulo);
    if (!m) continue;
    let valor = (m[1] ?? "").replace(/^\([^)]*\)\s*[:\-–=]?\s*/, "").trim();
    if (!valor) {
      for (let j = i + 1; j < Math.min(i + 3, linhas.length); j++) {
        const prox = (linhas[j] ?? "").trim();
        if (prox) {
          valor = prox;
          break;
        }
      }
    }
    valor = valor.replace(/^[:\-–=]\s*/, "").replace(/[.;,]+$/, "").trim();
    if (valor && !/^(obrigat|em seu nome)/i.test(valor)) return valor.slice(0, 140);
  }
  return "";
}

/** Transporte próprio, tipo do veículo e ponto de embarque. */
export function extrairTransporte(linhas: string[]): {
  transporte_proprio: boolean;
  transporte_tipos: string[];
  transporte_observacao: string;
} {
  const marcado = (trecho: string, palavra: "sim" | "n[ãa]o") =>
    new RegExp(`[(\\[]\\s*[x×✓✔]\\s*[)\\]]\\s*${palavra}\\b`, "i").test(trecho);

  let proprio = false;
  const tipos: string[] = [];
  let ponto = "";

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i] ?? "";
    if (/(possui\s+condu|possui\s+transporte|transporte\s+pr[óo]prio|condu[çc][ãa]o)/i.test(linha)) {
      const bloco = [linha, linhas[i + 1] ?? ""].join(" ");
      if (marcado(bloco, "sim")) proprio = true;
      else if (marcado(bloco, "n[ãa]o")) proprio = false;
    }
    if (/se\s+sim,?\s*qual/i.test(linha)) {
      const valor = (linha.split(/qual\s*[?:]?\s*/i)[1] ?? linhas[i + 1] ?? "").toLowerCase();
      if (/bicicleta\s*el[ée]tr/.test(valor)) tipos.push("bicicleta_eletrica");
      else if (/bicicleta|bike/.test(valor)) tipos.push("bicicleta");
      if (/\bmoto\b|motocicleta/.test(valor)) tipos.push("moto");
      if (/\bcarro\b|autom[óo]vel/.test(valor)) tipos.push("carro");
    }
    if (/ponto\s+de\s+embarque/i.test(linha)) {
      const valor = (linha.split(/[:\-–=]/).slice(1).join(":") || linhas[i + 1] || "").trim();
      if (valor) ponto = valor.slice(0, 200);
    }
  }

  if (tipos.length > 0) proprio = true;
  return {
    transporte_proprio: proprio,
    transporte_tipos: Array.from(new Set(tipos)),
    transporte_observacao: ponto ? `Ponto de embarque: ${ponto}` : "",
  };
}

/** Lista, em português, os campos que não foram identificados. */
export function camposFaltantes(d: Pick<DadosFicha, "nome" | "cpf" | "telefone">): string[] {
  const faltas: string[] = [];
  if (!d.nome) faltas.push("Não foi possível identificar o nome do colaborador.");
  if (!d.cpf) faltas.push("Não foi possível identificar o CPF na ficha.");
  if (!d.telefone) faltas.push("Não foi possível identificar o telefone.");
  return faltas;
}

