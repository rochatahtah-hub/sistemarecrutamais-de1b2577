import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const DIAS_SEMANA = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
] as const;

export const PERIODOS = ["Manhã", "Tarde", "Noite", "Qualquer horário"] as const;

export const STATUS_COLABORADOR = [
  "novo",
  "disponivel",
  "em_contato",
  "selecionado",
  "indisponivel",
  "bloqueado",
] as const;

export type StatusColaborador = (typeof STATUS_COLABORADOR)[number];

export const STATUS_ROTULO: Record<StatusColaborador, string> = {
  novo: "Novo",
  disponivel: "Disponível",
  em_contato: "Em contato",
  selecionado: "Selecionado",
  indisponivel: "Indisponível",
  bloqueado: "Bloqueado",
};

export interface ColaboradorDiaria {
  id: string;
  full_name: string;
  phone: string;
  cpf_mascara: string;
  city: string;
  neighborhood: string;
  available_for_daily: boolean;
  available_days: string[];
  available_periods: string[];
  desired_role: string;
  status: string;
  observacao: string;
  consent_date: string | null;
  created_at: string;
}

export interface NovoColaboradorDiaria {
  full_name: string;
  phone: string;
  cpf: string;
  city: string;
  neighborhood: string;
  available_for_daily: boolean;
  available_days: string[];
  available_periods: string[];
  desired_role: string;
  transporte_proprio?: boolean;
  transporte_tipos?: string[];
  precisa_fretado?: boolean;
  transporte_observacao?: string;
}

const CAMPOS =
  "id,full_name,phone,cpf_mascara,city,neighborhood,available_for_daily,available_days,available_periods,desired_role,status,observacao,consent_date,created_at,transporte_proprio,transporte_tipos,precisa_fretado,transporte_observacao";

export function soDigitosTelefone(valor: string) {
  return (valor ?? "").replace(/\D+/g, "").slice(0, 11);
}

export function soDigitosCpf(valor: string) {
  return (valor ?? "").replace(/\D+/g, "").slice(0, 11);
}

export function formatarCpf(valor: string) {
  const d = soDigitosCpf(valor);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, "$1.$2.$3-$4");
}

/** Validação oficial de CPF (dígitos verificadores). */
export function cpfValido(valor: string) {
  const d = soDigitosCpf(valor);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (base: string, pesoInicial: number) => {
    let soma = 0;
    for (let i = 0; i < base.length; i += 1) soma += Number(base[i]) * (pesoInicial - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(d.slice(0, 9), 10) === Number(d[9]) && digito(d.slice(0, 10), 11) === Number(d[10]);
}

export function formatarTelefone(valor: string) {
  const d = soDigitosTelefone(valor);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/[-\s()]*$/, "");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/[-\s()]*$/, "");
}

/** Envio público do portal de diárias (sem login). */
export async function cadastrarColaboradorPublico(dados: NovoColaboradorDiaria) {
  const { error } = await supabase.from("daily_workers").insert({
    ...dados,
    phone: soDigitosTelefone(dados.phone),
    cpf: soDigitosCpf(dados.cpf),
    status: "novo",
    consent_accepted: true,
    consent_date: new Date().toISOString(),
  });
  if (error) {
    if (error.code === "23505") {
      throw new Error(
        /cpf/i.test(error.message)
          ? "Já encontramos um cadastro com este CPF."
          : "Já encontramos um cadastro com este telefone.",
      );
    }
    throw new Error("Não foi possível concluir o cadastro. Tente novamente em instantes.");
  }
}

export interface FiltrosDiarias {
  busca?: string;
  cidade?: string;
  status?: string;
  disponivel?: "todos" | "sim" | "nao";
  dia?: string;
  periodo?: string;
}

export function useColaboradoresDiaria(filtros: FiltrosDiarias, habilitado = true) {
  return useQuery({
    queryKey: ["daily-workers", filtros],
    enabled: habilitado,
    queryFn: async () => {
      let q = supabase.from("daily_workers").select(CAMPOS).order("created_at", { ascending: false });
      const termo = (filtros.busca ?? "").trim().replace(/[%,()]/g, " ");
      if (termo) q = q.or(`full_name.ilike.%${termo}%,phone.ilike.%${termo}%,neighborhood.ilike.%${termo}%`);
      if (filtros.cidade) q = q.ilike("city", `%${filtros.cidade}%`);
      if (filtros.status && filtros.status !== "todos") q = q.eq("status", filtros.status);
      if (filtros.disponivel === "sim") q = q.eq("available_for_daily", true);
      if (filtros.disponivel === "nao") q = q.eq("available_for_daily", false);
      if (filtros.dia) q = q.contains("available_days", [filtros.dia]);
      if (filtros.periodo) q = q.contains("available_periods", [filtros.periodo]);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return (data ?? []) as ColaboradorDiaria[];
    },
  });
}

export function useAtualizarColaboradorDiaria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: Partial<ColaboradorDiaria> }) => {
      const { error } = await supabase.from("daily_workers").update(dados).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["daily-workers"] }),
  });
}

export function useExcluirColaboradorDiaria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("daily_workers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["daily-workers"] }),
  });
}

export function useCriarColaboradorDiaria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: NovoColaboradorDiaria) => {
      const { error } = await supabase.from("daily_workers").insert({
        ...dados,
        phone: soDigitosTelefone(dados.phone),
        cpf: soDigitosCpf(dados.cpf),
        status: "disponivel",
        consent_accepted: true,
        consent_date: new Date().toISOString(),
      });
      if (error) {
        if (error.code === "23505") {
          throw new Error(/cpf/i.test(error.message) ? "CPF já cadastrado." : "Telefone já cadastrado.");
        }
        throw error;
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["daily-workers"] }),
  });
}

/** CPF completo — o banco só devolve para administradores (master/admin). */
export function useCpfCompleto(id: string | null) {
  return useQuery({
    queryKey: ["daily-worker-cpf", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("cpf_colaborador_diaria", { _id: id! });
      if (error) throw error;
      return (data as string | null) ?? null;
    },
  });
}