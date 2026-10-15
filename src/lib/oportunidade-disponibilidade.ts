export interface DisponibilidadeOportunidade {
  modalidade: string;
  tipo_diaria?: string;
  status: string;
  data_oportunidade: string | null;
  vaga_id?: string | null;
  vaga?: { tenant_id?: string; situacao: string; status: string } | null;
}

export function motivoIndisponibilidade(
  o: DisponibilidadeOportunidade,
  config: { diarias_ativa: boolean; oportunidades_ativa: boolean; clt_ativa: boolean },
  dia: string,
): string | null {
  if (o.status !== "ativa") return "Esta oportunidade foi encerrada ou despublicada.";
  const ativa = o.modalidade === "clt" ? config.clt_ativa
    : o.tipo_diaria === "avulsa" ? config.diarias_ativa : config.oportunidades_ativa;
  if (!ativa) return "Esta oportunidade não está publicada no momento.";
  if (o.modalidade !== "clt" && o.data_oportunidade && o.data_oportunidade < dia)
    return "Esta diária já foi encerrada.";
  if (o.vaga_id && (!o.vaga || ["FECHADA", "CANCELADA"].includes(o.vaga.situacao) || o.vaga.status === "CANCELAMENTO"))
    return "Esta vaga foi encerrada ou cancelada.";
  return null;
}

export function diaPublicacaoAtual() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}