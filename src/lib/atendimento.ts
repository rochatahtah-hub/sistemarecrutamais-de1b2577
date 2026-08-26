import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useProgramadoras } from "@/lib/programacao";

export type StatusValidacao = "PENDENTE" | "VALIDADO" | "DIVERGENCIA" | "HISTORICO_NAO_AVALIADO";

export const STATUS_VALIDACAO_LABEL: Record<StatusValidacao, string> = {
  PENDENTE: "🟡 Pendente",
  VALIDADO: "🟢 Validado",
  DIVERGENCIA: "🔴 Divergência",
  HISTORICO_NAO_AVALIADO: "Histórico — não avaliado",
};

export type JornadaCompleta = "SIM" | "NAO" | "PARCIAL";
export type TipoAdicional = "NENHUM" | "SABADO" | "DOMINGO" | "FERIADO" | "OUTRO";

export const TIPO_ADICIONAL_LABEL: Record<TipoAdicional, string> = {
  NENHUM: "Sem adicional",
  SABADO: "Sábado",
  DOMINGO: "Domingo",
  FERIADO: "Feriado",
  OUTRO: "Outro",
};

/** Itens do checklist de conferência (regra 27) — só marcações de apoio visual. */
export const ITENS_CHECKLIST: { chave: string; rotulo: string }[] = [
  { chave: "colaborador", rotulo: "Colaborador conferido" },
  { chave: "empresa", rotulo: "Empresa conferida" },
  { chave: "vaga", rotulo: "Vaga conferida" },
  { chave: "data", rotulo: "Data conferida" },
  { chave: "situacao", rotulo: "Situação conferida" },
  { chave: "jornada", rotulo: "Jornada conferida" },
  { chave: "valor_diaria", rotulo: "Valor da diária conferido" },
  { chave: "ajuda_custo", rotulo: "Ajuda de custo conferida" },
  { chave: "adicional", rotulo: "Adicional conferido" },
  { chave: "total", rotulo: "Total conferido" },
];

export const MOTIVOS_DIVERGENCIA = [
  "Colaborador não compareceu",
  "Colaborador não estava programado",
  "Valor incorreto",
  "Ajuda de custo divergente",
  "Jornada divergente",
  "Adicional incorreto",
  "Feriado não identificado",
  "Data incorreta",
  "Informação incompleta",
  "Outro",
] as const;

export interface Conferencia {
  id: string | null;
  status_validacao: StatusValidacao;
  validado_por_nome: string;
  validado_em: string | null;
  horario_realizado_entrada: string;
  horario_realizado_saida: string;
  jornada_completa: JornadaCompleta | null;
  horas_trabalhadas: number | null;
  motivo_jornada_parcial: string;
  valor_diaria: number | null;
  tem_ajuda_custo: boolean;
  ajuda_custo_valor: number;
  tipo_adicional: TipoAdicional;
  adicional_percentual: number;
  adicional_motivo: string;
  total_estimado: number | null;
  checklist: Record<string, boolean>;
  observacao: string;
}

export interface RegistroAtendimento {
  vaga_id: string;
  data: string;
  status_vaga: string;
  empresa_id: string | null;
  empresa: string;
  candidato_id: string | null;
  nome: string;
  cpf: string;
  telefone: string;
  cargo: string;
  horario_programado: string;
  programadora_id: string | null;
  programadora_nome: string;
  conferencia: Conferencia;
}

/** Deriva o status de exibição quando ainda não existe linha de conferência gravada. */
export function derivarStatusValidacao(
  _statusVaga: string,
  conferencia: { status_validacao: string } | null,
): StatusValidacao {
  if (conferencia) return conferencia.status_validacao as StatusValidacao;
  return "HISTORICO_NAO_AVALIADO";
}

export interface ValoresConferencia {
  valorDiaria?: number | null | undefined;
  adicionalPercentual?: number | null | undefined;
  ajudaCustoValor?: number | null | undefined;
}

/** Soma simples dos valores informados manualmente — nunca uma fórmula financeira nova. */
export function calcularTotalEstimado(v: ValoresConferencia): number {
  const base = v.valorDiaria ?? 0;
  const percentual = v.adicionalPercentual ?? 0;
  const ajuda = v.ajudaCustoValor ?? 0;
  const comAdicional = base + base * (percentual / 100);
  return Math.round((comAdicional + ajuda) * 100) / 100;
}

export function ehSabado(data: string): boolean {
  return new Date(`${data}T00:00:00`).getDay() === 6;
}

export function ehDomingo(data: string): boolean {
  return new Date(`${data}T00:00:00`).getDay() === 0;
}

interface LinhaConferencia {
  id: string;
  status_validacao: string;
  validado_por_nome: string;
  validado_em: string | null;
  horario_realizado_entrada: string;
  horario_realizado_saida: string;
  jornada_completa: string | null;
  horas_trabalhadas: number | null;
  motivo_jornada_parcial: string;
  valor_diaria: number | null;
  tem_ajuda_custo: boolean;
  ajuda_custo_valor: number;
  tipo_adicional: string;
  adicional_percentual: number;
  adicional_motivo: string;
  total_estimado: number | null;
  checklist: Record<string, boolean> | null;
  observacao: string;
}

interface LinhaVaga {
  id: string;
  data: string;
  status: string;
  descricao: string | null;
  cargo: string;
  horario: string;
  empresa_id: string | null;
  programadora_id: string | null;
  empresas: { nome: string } | null;
  candidatos: { id: string; nome: string; cpf: string; telefone: string | null } | null;
  atendimento_conferencias: LinhaConferencia | LinhaConferencia[] | null;
}

const CAMPOS_CONFERENCIA =
  "id,status_validacao,validado_por_nome,validado_em,horario_realizado_entrada,horario_realizado_saida," +
  "jornada_completa,horas_trabalhadas,motivo_jornada_parcial,valor_diaria,tem_ajuda_custo,ajuda_custo_valor," +
  "tipo_adicional,adicional_percentual,adicional_motivo,total_estimado,checklist,observacao";

/** Todas as fichas com resultado definido (presença/falta/cancelamento), com sua conferência. */
export async function buscarConferencias(): Promise<RegistroAtendimento[]> {
  const { data, error } = await supabase
    .from("vagas")
    .select(
      `id,data,status,descricao,cargo,horario,empresa_id,programadora_id,empresas(nome),candidatos(id,nome,cpf,telefone),atendimento_conferencias(${CAMPOS_CONFERENCIA})`,
    )
    .in("status", ["PRESENCA", "FALTA", "CANCELAMENTO"])
    .order("data", { ascending: false })
    .limit(1000);
  if (error) throw error;

  return ((data ?? []) as unknown as LinhaVaga[]).map((l) => {
    const c = Array.isArray(l.atendimento_conferencias)
      ? (l.atendimento_conferencias[0] ?? null)
      : l.atendimento_conferencias;

    const conferencia: Conferencia = {
      id: c?.id ?? null,
      status_validacao: derivarStatusValidacao(l.status, c),
      validado_por_nome: c?.validado_por_nome ?? "",
      validado_em: c?.validado_em ?? null,
      horario_realizado_entrada: c?.horario_realizado_entrada ?? "",
      horario_realizado_saida: c?.horario_realizado_saida ?? "",
      jornada_completa: (c?.jornada_completa as JornadaCompleta | null) ?? null,
      horas_trabalhadas: c?.horas_trabalhadas ?? null,
      motivo_jornada_parcial: c?.motivo_jornada_parcial ?? "",
      valor_diaria: c?.valor_diaria ?? null,
      tem_ajuda_custo: c?.tem_ajuda_custo ?? false,
      ajuda_custo_valor: c?.ajuda_custo_valor ?? 0,
      tipo_adicional: (c?.tipo_adicional as TipoAdicional | undefined) ?? "NENHUM",
      adicional_percentual: c?.adicional_percentual ?? 0,
      adicional_motivo: c?.adicional_motivo ?? "",
      total_estimado: c?.total_estimado ?? null,
      checklist: c?.checklist ?? {},
      observacao: c?.observacao ?? "",
    };

    return {
      vaga_id: l.id,
      data: l.data,
      status_vaga: l.status,
      empresa_id: l.empresa_id,
      empresa: l.empresas?.nome ?? "—",
      candidato_id: l.candidatos?.id ?? null,
      nome: l.candidatos?.nome ?? l.descricao ?? "—",
      cpf: l.candidatos?.cpf ?? "",
      telefone: l.candidatos?.telefone ?? "",
      cargo: l.cargo || l.descricao || "",
      horario_programado: l.horario ?? "",
      programadora_id: l.programadora_id,
      programadora_nome: "",
      conferencia,
    };
  });
}

/** Lista de fichas do Atendimento, já com o nome do programador preenchido. */
export function useConferencias() {
  const { user } = useAuth();
  const consulta = useQuery({
    enabled: Boolean(user),
    queryKey: ["atendimento-conferencias"],
    queryFn: buscarConferencias,
  });
  const { data: programadoras = [] } = useProgramadoras();

  const registros = useMemo(() => {
    if (!consulta.data) return consulta.data;
    const mapa = new Map(programadoras.map((p) => [p.id, p.nome]));
    return consulta.data.map((r) => ({
      ...r,
      programadora_nome: (r.programadora_id ? mapa.get(r.programadora_id) : undefined) ?? "",
    }));
  }, [consulta.data, programadoras]);

  return { ...consulta, data: registros };
}

export interface Divergencia {
  id: string;
  tipo: string;
  observacao: string;
  status: "ABERTA" | "RESOLVIDA";
  aberta_por_nome: string;
  aberta_em: string;
  resolvida_por_nome: string;
  resolvida_em: string | null;
  resultado: string;
}

export async function buscarDivergencias(vagaId: string): Promise<Divergencia[]> {
  const { data, error } = await supabase
    .from("atendimento_divergencias")
    .select(
      "id,tipo,observacao,status,aberta_por_nome,aberta_em,resolvida_por_nome,resolvida_em,resultado",
    )
    .eq("vaga_id", vagaId)
    .order("aberta_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Divergencia[];
}

export function useDivergencias(vagaId: string | null) {
  return useQuery({
    queryKey: ["atendimento-divergencias", vagaId],
    enabled: !!vagaId,
    queryFn: () => buscarDivergencias(vagaId!),
  });
}

export interface DadosSalvarConferencia {
  vagaId: string;
  horarioRealizadoEntrada?: string;
  horarioRealizadoSaida?: string;
  jornadaCompleta?: JornadaCompleta | null;
  horasTrabalhadas?: number | null;
  motivoJornadaParcial?: string;
  valorDiaria?: number | null;
  temAjudaCusto?: boolean;
  ajudaCustoValor?: number;
  tipoAdicional?: TipoAdicional;
  adicionalPercentual?: number;
  adicionalMotivo?: string;
  checklist?: Record<string, boolean>;
  observacao?: string;
}

/** Grava os dados de conferência (jornada/valores/checklist). Não altera o status de validação. */
export async function salvarConferencia(dados: DadosSalvarConferencia) {
  const ajudaCustoValor = dados.temAjudaCusto ? (dados.ajudaCustoValor ?? 0) : 0;
  const totalEstimado = calcularTotalEstimado({
    valorDiaria: dados.valorDiaria,
    adicionalPercentual: dados.adicionalPercentual,
    ajudaCustoValor,
  });

  const { error } = await supabase.from("atendimento_conferencias").upsert(
    {
      vaga_id: dados.vagaId,
      horario_realizado_entrada: dados.horarioRealizadoEntrada?.trim() ?? "",
      horario_realizado_saida: dados.horarioRealizadoSaida?.trim() ?? "",
      jornada_completa: dados.jornadaCompleta ?? null,
      horas_trabalhadas: dados.horasTrabalhadas ?? null,
      motivo_jornada_parcial: dados.motivoJornadaParcial?.trim() ?? "",
      valor_diaria: dados.valorDiaria ?? null,
      tem_ajuda_custo: dados.temAjudaCusto ?? false,
      ajuda_custo_valor: ajudaCustoValor,
      tipo_adicional: dados.tipoAdicional ?? "NENHUM",
      adicional_percentual: dados.adicionalPercentual ?? 0,
      adicional_motivo: dados.adicionalMotivo?.trim() ?? "",
      checklist: dados.checklist ?? {},
      observacao: dados.observacao?.trim() ?? "",
      total_estimado: totalEstimado,
    },
    { onConflict: "vaga_id" },
  );
  if (error) throw new Error(error.message);
}

/** Valida a ficha e libera para a Parede de Pagamentos. Bloqueada no banco se houver divergência aberta. */
export async function validarConferencia(vagaId: string) {
  const { error } = await supabase
    .from("atendimento_conferencias")
    .upsert({ vaga_id: vagaId, status_validacao: "VALIDADO" }, { onConflict: "vaga_id" });
  if (error) throw new Error(error.message);
}

export interface DadosAbrirDivergencia {
  vagaId: string;
  conferenciaId: string | null;
  tipo: string;
  observacao?: string;
}

/** Abre uma divergência — a ficha para de estar liberada para pagamento até a resolução. */
export async function abrirDivergencia(dados: DadosAbrirDivergencia) {
  if (!dados.tipo.trim()) throw new Error("Selecione o motivo da divergência.");
  if (!dados.conferenciaId) {
    throw new Error("Salve a conferência desta ficha antes de apontar uma divergência.");
  }
  const { error } = await supabase.from("atendimento_divergencias").insert({
    conferencia_id: dados.conferenciaId,
    vaga_id: dados.vagaId,
    tipo: dados.tipo.trim(),
    observacao: dados.observacao?.trim() ?? "",
  });
  if (error) throw new Error(error.message);
}

export interface DadosResolverDivergencia {
  divergenciaId: string;
  resultado: string;
}

/** Fecha a divergência. A ficha volta para PENDENTE — precisa ser validada de novo. */
export async function resolverDivergencia(dados: DadosResolverDivergencia) {
  if (!dados.resultado.trim()) throw new Error("Descreva como a divergência foi resolvida.");
  const { error } = await supabase
    .from("atendimento_divergencias")
    .update({ status: "RESOLVIDA", resultado: dados.resultado.trim() })
    .eq("id", dados.divergenciaId);
  if (error) throw new Error(error.message);
}

export function useSalvarConferencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salvarConferencia,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["atendimento-conferencias"] }),
  });
}

export function useValidarConferencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: validarConferencia,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["atendimento-conferencias"] }),
  });
}

export function useAbrirDivergencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: abrirDivergencia,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["atendimento-conferencias"] });
      void qc.invalidateQueries({ queryKey: ["atendimento-divergencias"] });
    },
  });
}

export function useResolverDivergencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: resolverDivergencia,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["atendimento-conferencias"] });
      void qc.invalidateQueries({ queryKey: ["atendimento-divergencias"] });
    },
  });
}
