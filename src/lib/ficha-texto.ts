/** Interpreta a ficha colada e extrai somente nome, CPF e telefone. */
export interface DadosFicha {
  nome: string;
  cpf: string;
  telefone: string;
}

const digitos = (v: string) => v.replace(/\D/g, "");

function apos(texto: string, rotulos: string[]) {
  for (const linha of texto.split(/\r?\n/)) {
    for (const r of rotulos) {
      const re = new RegExp(`${r}\\s*[:\\-–]\\s*(.+)`, "i");
      const m = linha.match(re);
      if (m && m[1] && m[1].trim()) return m[1].trim();
    }
  }
  return "";
}

export function interpretarFicha(texto: string): DadosFicha {
  const t = (texto ?? "").replace(/\u00a0/g, " ");

  let cpf = digitos(apos(t, ["cpf", "c\\.p\\.f"]));
  if (cpf.length !== 11) {
    const m = t.match(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/);
    cpf = m ? digitos(m[0]) : "";
  }
  if (cpf.length !== 11) cpf = "";

  let tel = digitos(apos(t, ["telefone", "celular", "fone", "whatsapp", "whats", "contato", "tel"]));
  if (tel.length < 10 || tel.length > 11) {
    const m = t.match(/\(?\d{2}\)?\s?9?\d{4}[-\s.]?\d{4}/g)?.find((c) => {
      const d = digitos(c);
      return d.length >= 10 && d.length <= 11 && d !== cpf.slice(0, d.length);
    });
    tel = m ? digitos(m) : "";
  }
  if (tel.length < 10) tel = tel.length ? tel : "";

  let nome = apos(t, ["nome completo", "nome do candidato", "nome do colaborador", "candidato", "nome"]);
  if (!nome) {
    const linha = t
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => /^[A-Za-zÀ-ÿ'´` ]{6,60}$/.test(l) && l.split(/\s+/).length >= 2);
    nome = linha ?? "";
  }
  nome = nome.replace(/\s{2,}/g, " ").trim();

  return { nome, cpf, telefone: tel };
}
