import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const CHAVE = "recruta-mais:modo-privacidade";

interface PrivacidadeCtx {
  privado: boolean;
  alternar: () => void;
  /** Mascara nomes próprios: "João da Silva" -> "J** S*****". */
  nome: (valor: string | null | undefined) => string;
  /** Mascara CPF mantendo apenas os 2 últimos dígitos. */
  cpf: (valor: string | null | undefined) => string;
  /** Mascara telefones. */
  telefone: (valor: string | null | undefined) => string;
  /** Mascara qualquer texto sensível genérico. */
  texto: (valor: string | null | undefined) => string;
  /** Mascara nome de empresa/cliente: "Empresa Exemplo" -> "EMPRESA •••". */
  empresa: (valor: string | null | undefined) => string;
  /** Mascara quantidades sensíveis (presenças, faltas, cancelamentos). */
  numero: (valor: number | string | null | undefined) => string;
  /**
   * Mascara nomes de clientes e colaboradores dentro de frases livres
   * (insights, alertas, descrições).
   */
  frase: (
    texto: string | null | undefined,
    nomes?: { empresas?: string[]; pessoas?: string[] },
  ) => string;
}

const Ctx = createContext<PrivacidadeCtx | null>(null);

export function mascararNome(valor: string) {
  const partes = valor.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "•••";
  return partes
    .filter((p) => p.length > 2 || partes.length === 1)
    .slice(0, 3)
    .map((p) => `${p[0]?.toUpperCase() ?? ""}${"*".repeat(Math.max(1, p.length - 1))}`)
    .join(" ");
}

export function mascararCpf(valor: string) {
  const digitos = valor.replace(/\D/g, "");
  if (!digitos) return "•••.•••.•••-••";
  return `•••.•••.•••-${digitos.slice(-2)}`;
}

export function mascararTelefone(valor: string) {
  const digitos = valor.replace(/\D/g, "");
  if (!digitos) return "(••) •••••-••••";
  return `(••) •••••-${digitos.slice(-4)}`;
}

export function mascararEmpresa(valor: string) {
  return valor.trim() ? "Cliente •••" : "Cliente oculto";
}

export function mascararNumero(valor: number | string) {
  const texto = String(valor ?? "");
  return "•".repeat(Math.max(3, Math.min(5, texto.length)));
}

function escaparRegex(valor: string) {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Substitui, dentro de um texto, os nomes de empresas e pessoas informados. */
export function mascararFrase(
  texto: string,
  empresas: string[] = [],
  pessoas: string[] = [],
  rotularEmpresa: (nome: string) => string = mascararEmpresa,
) {
  let saida = texto;
  const alvos = [
    ...empresas.map((n) => ({ n, mascarar: rotularEmpresa })),
    ...pessoas.map((n) => ({ n, mascarar: mascararNome })),
  ]
    .filter((a) => a.n && a.n.trim().length >= 3)
    .sort((a, b) => b.n.length - a.n.length);

  for (const alvo of alvos) {
    saida = saida.replace(new RegExp(escaparRegex(alvo.n), "gi"), alvo.mascarar(alvo.n));
  }
  return saida;
}

export function PrivacidadeProvider({ children }: { children: ReactNode }) {
  const [privado, setPrivado] = useState(false);
  const clientes = useRef(new Map<string, string>());

  useEffect(() => {
    try {
      setPrivado(window.localStorage.getItem(CHAVE) === "1");
    } catch {
      /* armazenamento indisponível */
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("modo-privacidade", privado);
  }, [privado]);

  const alternar = useCallback(() => {
    setPrivado((atual) => {
      const proximo = !atual;
      try {
        window.localStorage.setItem(CHAVE, proximo ? "1" : "0");
      } catch {
        /* armazenamento indisponível */
      }
      return proximo;
    });
  }, []);

  const empresa = useCallback((valor: string | null | undefined) => {
    const nome = (valor ?? "").trim();
    if (!privado) return nome;
    if (!nome) return "Cliente oculto";
    const chave = nome.toLocaleLowerCase("pt-BR");
    const existente = clientes.current.get(chave);
    if (existente) return existente;
    const rotulo = `Cliente ${String(clientes.current.size + 1).padStart(2, "0")}`;
    clientes.current.set(chave, rotulo);
    return rotulo;
  }, [privado]);

  const valor = useMemo<PrivacidadeCtx>(
    () => ({
      privado,
      alternar,
      nome: (v) => (privado ? mascararNome(v ?? "") : (v ?? "")),
      cpf: (v) => (privado ? mascararCpf(v ?? "") : (v ?? "")),
      telefone: (v) => (privado ? mascararTelefone(v ?? "") : (v ?? "")),
      texto: (v) => (privado ? "••••••" : (v ?? "")),
      empresa,
      numero: (v) => (privado ? mascararNumero(v ?? "") : String(v ?? "")),
      frase: (v, nomes) =>
        privado
          ? mascararFrase(v ?? "", nomes?.empresas ?? [], nomes?.pessoas ?? [], empresa)
          : (v ?? ""),
    }),
    [privado, alternar, empresa],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function usePrivacidade() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePrivacidade precisa estar dentro de PrivacidadeProvider");
  return ctx;
}

/** Exibe um dado sensível já mascarado quando o modo privacidade está ativo. */
export function Sigiloso({
  valor,
  tipo = "nome",
}: {
  valor: string | number | null | undefined;
  tipo?: "nome" | "cpf" | "telefone" | "texto" | "empresa" | "numero";
}) {
  const p = usePrivacidade();
  if (tipo === "numero") return <>{p.numero(valor)}</>;
  return <>{p[tipo](valor == null ? "" : String(valor))}</>;
}