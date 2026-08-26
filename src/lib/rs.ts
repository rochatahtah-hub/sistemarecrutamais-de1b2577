import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { cpfValido, soDigitosCpf } from "@/lib/diarias";

export type StatusRS = "ativo" | "desligado";

export interface EmpresaCLT {
  id: string;
  nome: string;
  cnpj: string;
  contato: string;
  cidade: string;
  observacao: string;
  ativo: boolean;
  created_at: string;
}

export interface CandidatoCLT {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  empresa_id: string | null;
  cargo: string;
  data_admissao: string | null;
  status: StatusRS;
  data_desligamento: string | null;
  motivo_desligamento: string;
  recrutador_nome: string;
  observacao: string;
  created_at: string;
  rs_empresas?: { nome: string } | null;
}

export interface HistoricoRS {
  id: string;
  candidato_id: string;
  acao: string;
  campo: string;
  valor_anterior: string;
  valor_novo: string;
  usuario_nome: string;
  created_at: string;
}

export interface CargoRS {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
}

const CAMPOS_CANDIDATO =
  "id,nome,cpf,telefone,empresa_id,cargo,data_admissao,status,data_desligamento,motivo_desligamento,recrutador_nome,observacao,created_at,rs_empresas(nome)";

/** Dias entre a admissão e o desligamento (ou hoje, para ativos). */
export function diasDePermanencia(c: {
  data_admissao: string | null;
  data_desligamento: string | null;
}): number | null {
  if (!c.data_admissao) return null;
  const inicio = new Date(`${c.data_admissao}T00:00:00`);
  const fim = c.data_desligamento ? new Date(`${c.data_desligamento}T00:00:00`) : new Date();
  const dias = Math.floor((fim.getTime() - inicio.getTime()) / 86_400_000);
  return dias < 0 ? 0 : dias;
}

/** Converte dias em texto amigável: "15 dias", "8 meses e 12 dias", "1 ano e 4 meses". */
export function permanenciaTexto(dias: number | null): string {
  if (dias === null) return "—";
  if (dias < 31) return `${dias} ${dias === 1 ? "dia" : "dias"}`;
  const anos = Math.floor(dias / 365);
  const resto = dias - anos * 365;
  const meses = Math.floor(resto / 30);
  const diasRestantes = resto - meses * 30;
  const partes: string[] = [];
  if (anos) partes.push(`${anos} ${anos === 1 ? "ano" : "anos"}`);
  if (meses) partes.push(`${meses} ${meses === 1 ? "mês" : "meses"}`);
  if (!anos && diasRestantes)
    partes.push(`${diasRestantes} ${diasRestantes === 1 ? "dia" : "dias"}`);
  return partes.join(" e ") || `${dias} dias`;
}

export const FAIXAS_PERMANENCIA = [
  { rotulo: "Até 30 dias", teste: (d: number) => d <= 30 },
  { rotulo: "31 a 90 dias", teste: (d: number) => d > 30 && d <= 90 },
  { rotulo: "91 a 180 dias", teste: (d: number) => d > 90 && d <= 180 },
  { rotulo: "181 a 365 dias", teste: (d: number) => d > 180 && d <= 365 },
  { rotulo: "Mais de 1 ano", teste: (d: number) => d > 365 && d <= 730 },
  { rotulo: "Mais de 2 anos", teste: (d: number) => d > 730 },
] as const;

export function media(valores: number[]) {
  if (!valores.length) return 0;
  return Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);
}

/* ---------------- Empresas CLT ---------------- */

export function useEmpresasCLT() {
  return useQuery({
    queryKey: ["rs-empresas"],
    queryFn: async (): Promise<EmpresaCLT[]> => {
      const { data, error } = await supabase
        .from("rs_empresas")
        .select("id,nome,cnpj,contato,cidade,observacao,ativo,created_at")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as EmpresaCLT[];
    },
  });
}

export async function salvarEmpresaCLT(e: Partial<EmpresaCLT> & { nome: string }) {
  const dados = {
    nome: e.nome.trim(),
    cnpj: e.cnpj?.trim() ?? "",
    contato: e.contato?.trim() ?? "",
    cidade: e.cidade?.trim() ?? "",
    observacao: e.observacao?.trim() ?? "",
    ativo: e.ativo ?? true,
  };
  if (!dados.nome) throw new Error("Informe o nome da empresa.");
  const resp = e.id
    ? await supabase.from("rs_empresas").update(dados).eq("id", e.id)
    : await supabase.from("rs_empresas").insert(dados);
  if (resp.error) {
    if (resp.error.code === "23505") throw new Error("Já existe uma empresa CLT com esse nome.");
    throw resp.error;
  }
}

export function useSalvarEmpresaCLT() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salvarEmpresaCLT,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["rs-empresas"] }),
  });
}

export function useExcluirEmpresaCLT() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rs_empresas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["rs-empresas"] });
      void qc.invalidateQueries({ queryKey: ["rs-candidatos"] });
    },
  });
}

/* ---------------- Candidatos CLT ---------------- */

/* ---------------- Cargos CLT ---------------- */

export function useCargosCLT() {
  return useQuery({
    queryKey: ["rs-cargos"],
    queryFn: async (): Promise<CargoRS[]> => {
      const { data, error } = await supabase
        .from("rs_cargos")
        .select("id,nome,ativo,created_at")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as CargoRS[];
    },
  });
}

export async function salvarCargoCLT(c: { id?: string; nome: string; ativo?: boolean }) {
  const dados = { nome: c.nome.trim(), ativo: c.ativo ?? true };
  if (!dados.nome) throw new Error("Informe o nome do cargo.");
  const resp = c.id
    ? await supabase.from("rs_cargos").update(dados).eq("id", c.id)
    : await supabase.from("rs_cargos").insert(dados);
  if (resp.error) {
    if (resp.error.code === "23505") throw new Error("Esse cargo já está cadastrado.");
    throw new Error(resp.error.message);
  }
  return dados.nome;
}

export function useSalvarCargoCLT() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salvarCargoCLT,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["rs-cargos"] }),
  });
}

export function useExcluirCargoCLT() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rs_cargos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["rs-cargos"] }),
  });
}

export function useCandidatosCLT() {
  return useQuery({
    queryKey: ["rs-candidatos"],
    queryFn: async (): Promise<CandidatoCLT[]> => {
      const { data, error } = await supabase
        .from("rs_candidatos")
        .select(CAMPOS_CANDIDATO)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CandidatoCLT[];
    },
  });
}

export interface EntradaCandidatoCLT {
  id?: string;
  nome: string;
  cpf: string;
  telefone?: string;
  empresa_id: string | null;
  cargo: string;
  data_admissao: string | null;
  status: StatusRS;
  data_desligamento: string | null;
  motivo_desligamento?: string;
  recrutador_nome?: string;
  observacao?: string;
}

export async function salvarCandidatoCLT(c: EntradaCandidatoCLT) {
  const cpf = soDigitosCpf(c.cpf);
  if (!c.nome.trim()) throw new Error("Informe o nome completo do candidato.");
  if (!cpfValido(cpf)) throw new Error("Informe um CPF válido.");
  if (c.status === "desligado" && !c.data_desligamento)
    throw new Error("Informe a data de desligamento.");
  const dados = {
    nome: c.nome.trim(),
    cpf,
    telefone: c.telefone?.trim() ?? "",
    empresa_id: c.empresa_id,
    cargo: c.cargo.trim(),
    data_admissao: c.data_admissao || null,
    status: c.status,
    data_desligamento: c.status === "desligado" ? c.data_desligamento : null,
    motivo_desligamento: c.status === "desligado" ? (c.motivo_desligamento?.trim() ?? "") : "",
    recrutador_nome: c.recrutador_nome?.trim() ?? "",
    observacao: c.observacao?.trim() ?? "",
  };
  const resp = c.id
    ? await supabase.from("rs_candidatos").update(dados).eq("id", c.id)
    : await supabase.from("rs_candidatos").insert(dados);
  if (resp.error) {
    if (resp.error.code === "23505") throw new Error("Já existe um candidato CLT com esse CPF.");
    throw new Error(resp.error.message);
  }
}

export function useSalvarCandidatoCLT() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salvarCandidatoCLT,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["rs-candidatos"] }),
  });
}

export function useExcluirCandidatoCLT() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rs_candidatos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["rs-candidatos"] }),
  });
}

export function useHistoricoCandidatoCLT(candidatoId: string | null) {
  return useQuery({
    queryKey: ["rs-historico", candidatoId],
    enabled: !!candidatoId,
    queryFn: async (): Promise<HistoricoRS[]> => {
      const { data, error } = await supabase
        .from("rs_historico")
        .select("id,candidato_id,acao,campo,valor_anterior,valor_novo,usuario_nome,created_at")
        .eq("candidato_id", candidatoId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as HistoricoRS[];
    },
  });
}

export const CAMPO_ROTULO: Record<string, string> = {
  nome: "Nome",
  cpf: "CPF",
  telefone: "Telefone",
  empresa_id: "Empresa CLT",
  cargo: "Cargo",
  data_admissao: "Data de admissão",
  status: "Status",
  data_desligamento: "Data de desligamento",
  motivo_desligamento: "Motivo do desligamento",
  recrutador_nome: "Recrutador",
  observacao: "Observação",
};
