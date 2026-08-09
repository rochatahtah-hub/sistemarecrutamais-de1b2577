/** Utilitarios de quinzena: 1a = dia 01 ao 15, 2a = dia 16 ao ultimo dia do mes. */

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function ultimoDiaMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate();
}

export interface Quinzena {
  chave: string;
  ano: number;
  mes: number;
  numero: 1 | 2;
  inicio: string;
  fim: string;
  rotulo: string;
}

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function montarQuinzena(ano: number, mes: number, numero: 1 | 2): Quinzena {
  const inicio = numero === 1 ? 1 : 16;
  const fim = numero === 1 ? 15 : ultimoDiaMes(ano, mes);
  return {
    chave: `${ano}-${pad(mes)}-Q${numero}`,
    ano,
    mes,
    numero,
    inicio: `${ano}-${pad(mes)}-${pad(inicio)}`,
    fim: `${ano}-${pad(mes)}-${pad(fim)}`,
    rotulo: `${MESES[mes - 1]} — ${numero}ª quinzena`,
  };
}

export function quinzenaDe(dataISO: string): Quinzena {
  const [a, m, d] = dataISO.split("-").map(Number);
  return montarQuinzena(a ?? 1970, m ?? 1, (d ?? 1) <= 15 ? 1 : 2);
}

export function quinzenaAtual(): Quinzena {
  return quinzenaDe(hojeISO());
}

export function quinzenaAnterior(q: Quinzena): Quinzena {
  if (q.numero === 2) return montarQuinzena(q.ano, q.mes, 1);
  const mes = q.mes === 1 ? 12 : q.mes - 1;
  const ano = q.mes === 1 ? q.ano - 1 : q.ano;
  return montarQuinzena(ano, mes, 2);
}

export function ultimasQuinzenas(quantidade: number): Quinzena[] {
  const lista: Quinzena[] = [];
  let q = quinzenaAtual();
  for (let i = 0; i < quantidade; i++) {
    lista.push(q);
    q = quinzenaAnterior(q);
  }
  return lista;
}

export function dentroDaQuinzena(dataISO: string, q: Quinzena): boolean {
  return dataISO >= q.inicio && dataISO <= q.fim;
}
