import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fmtData } from "./metricas";
import {
  calcularLevantamentoDiario,
  horaAtualBrasilia,
  ontemBrasilia,
  type RegistroFechamento,
} from "./levantamento-diario-calculo";

/** Vagas do tenant cuja data de fechamento (já convertida a São Paulo pela
 * própria função SQL) cai em `dataReferencia` — nunca recalcula fuso em JS. */
async function buscarRegistrosDoDia(
  tenantId: string,
  dataReferencia: string,
): Promise<RegistroFechamento[]> {
  const { data, error } = await supabaseAdmin.rpc("levantamento_diario_vagas_do_dia", {
    _tenant: tenantId,
    _data: dataReferencia,
  });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    quantidade: r.quantidade,
    status: r.status,
    programadora_id: r.programadora_id,
    colaborador: r.colaborador,
  }));
}

async function buscarProgramadorasHabilitadas(
  tenantId: string,
): Promise<{ id: string; nome: string }[]> {
  const { data, error } = await supabaseAdmin.rpc("programadoras_habilitadas_do_tenant", {
    _tenant: tenantId,
  });
  if (error) throw error;
  return data ?? [];
}

/**
 * Gera (primeira vez) ou reprocessa (recalcula) o levantamento de uma data
 * para um tenant. Idempotente: nunca cria uma segunda linha para a mesma
 * data (índice único em `levantamentos_diarios`), sempre atualiza a linha
 * existente em caso de reprocessamento — o trigger de auditoria já registra
 * automaticamente o diff campo-a-campo.
 */
export async function gerarOuReprocessarLevantamento(opcoes: {
  tenantId: string;
  dataReferencia: string;
  origem: "automatico" | "usuario";
  usuarioId?: string | null;
  usuarioNome?: string;
}): Promise<{ levantamentoId: string; criado: boolean }> {
  const [registros, habilitadas] = await Promise.all([
    buscarRegistrosDoDia(opcoes.tenantId, opcoes.dataReferencia),
    buscarProgramadorasHabilitadas(opcoes.tenantId),
  ]);
  const calculado = calcularLevantamentoDiario(registros, opcoes.dataReferencia, habilitadas);

  const { data: existente, error: erroConsulta } = await supabaseAdmin
    .from("levantamentos_diarios")
    .select("id,vezes_reprocessado")
    .eq("tenant_id", opcoes.tenantId)
    .eq("data_referencia", opcoes.dataReferencia)
    .maybeSingle();
  if (erroConsulta) throw erroConsulta;

  const origemFinal =
    opcoes.origem === "automatico" ? "automatico" : existente ? "reprocessamento" : "manual";

  const linhaResumo = {
    tenant_id: opcoes.tenantId,
    data_referencia: opcoes.dataReferencia,
    vagas_fechadas: calculado.totais.vagas,
    presencas: calculado.totais.presencas,
    faltas: calculado.totais.faltas,
    cancelamentos: calculado.totais.cancelamentos,
    pct_presenca: calculado.totais.pctPresenca,
    pct_falta: calculado.totais.pctFalta,
    pct_cancelamento: calculado.totais.pctCancelamento,
    origem: origemFinal,
  };

  let levantamentoId: string;
  const criado = !existente;

  if (existente) {
    const { error } = await supabaseAdmin
      .from("levantamentos_diarios")
      .update({
        ...linhaResumo,
        reprocessado_em: new Date().toISOString(),
        reprocessado_por: opcoes.usuarioId ?? null,
        reprocessado_por_nome: opcoes.usuarioNome ?? "Sistema",
        vezes_reprocessado: existente.vezes_reprocessado + 1,
      })
      .eq("id", existente.id);
    if (error) throw error;
    levantamentoId = existente.id;
  } else {
    const { data: novo, error } = await supabaseAdmin
      .from("levantamentos_diarios")
      .insert(linhaResumo)
      .select("id")
      .single();
    if (error || !novo) throw new Error(error?.message ?? "Não foi possível gerar o levantamento.");
    levantamentoId = novo.id;
  }

  const { error: erroLimpeza } = await supabaseAdmin
    .from("levantamento_diario_programadores")
    .delete()
    .eq("levantamento_id", levantamentoId);
  if (erroLimpeza) throw erroLimpeza;

  if (calculado.porProgramador.length > 0) {
    const { error } = await supabaseAdmin.from("levantamento_diario_programadores").insert(
      calculado.porProgramador.map((l) => ({
        tenant_id: opcoes.tenantId,
        levantamento_id: levantamentoId,
        programadora_id: l.programadoraId,
        programadora_nome: l.nome,
        vagas_fechadas: l.vagas,
        presencas: l.presencas,
        faltas: l.faltas,
        cancelamentos: l.cancelamentos,
        pct_presenca: l.pctPresenca,
        pct_falta: l.pctFalta,
        pct_cancelamento: l.pctCancelamento,
        vaga_ids: l.vagaIds,
      })),
    );
    if (error) throw error;
  }

  return { levantamentoId, criado };
}

/** Notifica só quem tem a permissão "receber_notificacao" — nunca broadcast geral.
 * Idempotente: reprocessar/reexecutar não duplica notificação por usuário. */
async function notificarLevantamentoPronto(tenantId: string, dataReferencia: string) {
  const { data: destinatarios, error } = await supabaseAdmin.rpc("usuarios_com_permissao", {
    _tenant: tenantId,
    _modulo: "levantamento_diario",
    _acao: "receber_notificacao",
  });
  if (error) {
    console.error("[levantamento-diario] falha ao buscar destinatários:", error.message);
    return;
  }
  const usuarios = destinatarios ?? [];
  if (usuarios.length === 0) return;

  const { error: erroInsert } = await supabaseAdmin.from("notificacoes").upsert(
    usuarios.map((u) => ({
      user_id: u.user_id,
      tenant_id: tenantId,
      tipo: "levantamento_diario",
      titulo: "Levantamento Diário de Vagas pronto.",
      mensagem: `O levantamento referente a ${fmtData(dataReferencia)} já está disponível para consulta.`,
      para_admin: false,
      chave: `levantamento-diario-${dataReferencia}`,
    })),
    { onConflict: "tenant_id,user_id,chave", ignoreDuplicates: true },
  );
  if (erroInsert) console.error("[levantamento-diario] falha ao notificar:", erroInsert.message);
}

/**
 * Roda para todos os tenants com o módulo ativo: se já passou da hora
 * configurada hoje E ainda não existe levantamento de ONTEM, gera e notifica.
 * Cada tenant decide, neste instante, se é a sua vez — dispensa reagendar o
 * cron a cada mudança de horário. Usado pelo webhook público, nunca depende
 * de navegador aberto ou usuário logado.
 */
export async function rodarLevantamentoDiarioAutomatico() {
  const { data: configs, error } = await supabaseAdmin
    .from("levantamento_diario_config")
    .select("tenant_id,hora_geracao")
    .eq("ativo", true);
  if (error) throw error;

  const resultados: Array<{ tenantId: string; executado: boolean; motivo?: string }> = [];
  for (const config of configs ?? []) {
    if (horaAtualBrasilia() < config.hora_geracao) {
      resultados.push({ tenantId: config.tenant_id, executado: false, motivo: "ainda não é hora" });
      continue;
    }
    const dataAlvo = ontemBrasilia();
    try {
      const { data: existente } = await supabaseAdmin
        .from("levantamentos_diarios")
        .select("id")
        .eq("tenant_id", config.tenant_id)
        .eq("data_referencia", dataAlvo)
        .maybeSingle();
      if (existente) {
        resultados.push({ tenantId: config.tenant_id, executado: false, motivo: "já processado" });
        continue;
      }
      await gerarOuReprocessarLevantamento({
        tenantId: config.tenant_id,
        dataReferencia: dataAlvo,
        origem: "automatico",
      });
      await notificarLevantamentoPronto(config.tenant_id, dataAlvo);
      resultados.push({ tenantId: config.tenant_id, executado: true });
    } catch (e) {
      console.error(`[levantamento-diario] falha no tenant ${config.tenant_id}:`, e);
      resultados.push({
        tenantId: config.tenant_id,
        executado: false,
        motivo: (e as Error).message,
      });
    }
  }
  return { total: resultados.length, resultados };
}
