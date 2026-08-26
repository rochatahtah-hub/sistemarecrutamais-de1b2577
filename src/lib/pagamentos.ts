import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type StatusPagamento = "AGUARDANDO" | "PAGO" | "PROBLEMA" | "BLOQUEADO";

export const STATUS_PAGAMENTO_LABEL: Record<StatusPagamento, string> = {
  AGUARDANDO: "Aguardando pagamento",
  PAGO: "Pago",
  PROBLEMA: "Problema no pagamento",
  BLOQUEADO: "Pagamento bloqueado",
};

/** Situações que a pessoa usuária pode escolher manualmente. */
export const STATUS_PAGAMENTO_EDITAVEIS: StatusPagamento[] = ["AGUARDANDO", "PAGO", "PROBLEMA"];

export interface RegistroPagamento {
  /** Identificador do registro de programação (vínculo oficial). */
  vaga_id: string;
  pagamento_id: string | null;
  data: string;
  status_vaga: string;
  empresa_id: string | null;
  empresa: string;
  candidato_id: string | null;
  nome: string;
  cpf: string;
  telefone: string;
  pix: string;
  status: StatusPagamento;
  observacao: string;
  pago_em: string | null;
  pago_por_nome: string;
}

interface LinhaPagamento {
  id: string;
  status: string;
  observacao: string;
  pago_em: string | null;
  pago_por_nome: string;
}

interface LinhaVaga {
  id: string;
  data: string;
  status: string;
  descricao: string | null;
  empresa_id: string | null;
  empresas: { nome: string } | null;
  candidatos: {
    id: string;
    nome: string;
    cpf: string;
    telefone: string | null;
    pix_chave: string | null;
  } | null;
  pagamentos: LinhaPagamento | LinhaPagamento[] | null;
}

/**
 * Fila de pagamentos: toda programação com PRESENÇA entra automaticamente,
 * e registros que perderam a presença continuam visíveis como bloqueados.
 * Os dados pessoais vêm sempre da ficha do colaborador (fonte única).
 */
/** Deriva o status de exibição: registro explícito manda; sem registro, depende do resultado da vaga. */
export function derivarStatusPagamento(
  statusVaga: string,
  pagamento: { status: string } | null,
): StatusPagamento {
  if (pagamento) return pagamento.status as StatusPagamento;
  return statusVaga === "PRESENCA" ? "AGUARDANDO" : "BLOQUEADO";
}

export async function buscarPagamentos(): Promise<RegistroPagamento[]> {
  const { data, error } = await supabase
    .from("vagas")
    .select(
      "id,data,status,descricao,empresa_id,empresas(nome),candidatos(id,nome,cpf,telefone,pix_chave),pagamentos(id,status,observacao,pago_em,pago_por_nome)",
    )
    .in("status", ["PRESENCA", "FALTA", "CANCELAMENTO"])
    .order("data", { ascending: false })
    .limit(1000);
  if (error) throw error;

  return ((data ?? []) as unknown as LinhaVaga[])
    .map((l) => ({
      ...l,
      pagamento: (Array.isArray(l.pagamentos) ? (l.pagamentos[0] ?? null) : l.pagamentos) ?? null,
    }))
    .filter((l) => l.status === "PRESENCA" || l.pagamento !== null)
    .map((l) => {
      const pg = l.pagamento;
      return {
        vaga_id: l.id,
        pagamento_id: pg?.id ?? null,
        data: l.data,
        status_vaga: l.status,
        empresa_id: l.empresa_id,
        empresa: l.empresas?.nome ?? "—",
        candidato_id: l.candidatos?.id ?? null,
        nome: l.candidatos?.nome ?? l.descricao ?? "—",
        cpf: l.candidatos?.cpf ?? "",
        telefone: l.candidatos?.telefone ?? "",
        pix: l.candidatos?.pix_chave ?? "",
        status: derivarStatusPagamento(l.status, pg),
        observacao: pg?.observacao ?? "",
        pago_em: pg?.pago_em ?? null,
        pago_por_nome: pg?.pago_por_nome ?? "",
      };
    });
}

export function usePagamentos() {
  const { user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryKey: ["pagamentos"],
    queryFn: buscarPagamentos,
  });
}

export interface DadosSalvarPagamento {
  vagaId: string;
  status: StatusPagamento;
  observacao?: string;
  statusAtual?: StatusPagamento;
}

/** Grava o status de pagamento. Bloqueia re-confirmação de um pagamento já pago. */
export async function salvarPagamento(p: DadosSalvarPagamento) {
  if (p.statusAtual === "PAGO" && p.status === "PAGO") {
    throw new Error("Este pagamento já foi registrado como pago.");
  }
  const { error } = await supabase.from("pagamentos").upsert(
    {
      vaga_id: p.vagaId,
      status: p.status,
      observacao: p.observacao ?? "",
    },
    { onConflict: "vaga_id" },
  );
  if (error) throw new Error(error.message);
}

export function useSalvarPagamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salvarPagamento,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["pagamentos"] }),
  });
}
