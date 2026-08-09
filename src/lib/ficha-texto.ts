/** Interpreta a ficha colada e extrai somente nome, CPF e telefone. */
export interface DadosFicha {
  nome: string;
  cpf: string;
  telefone: string;
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

  return { nome, cpf, telefone: tel };
}

/** Lista, em português, os campos que não foram identificados. */
export function camposFaltantes(d: DadosFicha): string[] {
  const faltas: string[] = [];
  if (!d.nome) faltas.push("Não foi possível identificar o nome do colaborador.");
  if (!d.cpf) faltas.push("Não foi possível identificar o CPF na ficha.");
  if (!d.telefone) faltas.push("Não foi possível identificar o telefone.");
  return faltas;
}
