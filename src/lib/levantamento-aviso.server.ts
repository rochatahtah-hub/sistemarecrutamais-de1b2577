import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { mensagemLevantamentoPronto, periodoCompleto } from "./levantamento-aviso";
import { periodoQuinzena, quinzenaDaData } from "./levantamento-quinzena";
import { agoraBrasilia } from "./alertas-push";

/** Report events are only created after all report writes succeed. */
export async function registrarAvisosLevantamento(tenantId: string, dataReferencia: string) {
  const periodo = periodoQuinzena(Number(dataReferencia.slice(0, 4)), Number(dataReferencia.slice(5, 7)), quinzenaDaData(dataReferencia));
  const { data: dias, error } = await supabaseAdmin.from("levantamentos_diarios")
    .select("data_referencia").eq("tenant_id", tenantId)
    .gte("data_referencia", periodo.inicio).lte("data_referencia", periodo.fim);
  if (error) throw error;
  const datas = (dias ?? []).map(d => d.data_referencia);
  if (!datas.includes(dataReferencia)) return;
  const { data: usuarios, error: erroUsuarios } = await supabaseAdmin.rpc("usuarios_com_permissao", {
    _tenant: tenantId, _modulo: "levantamento_diario", _acao: "receber_notificacao",
  });
  if (erroUsuarios) throw erroUsuarios;
  if (!usuarios?.length) return;
  const { data: perfis, error: erroPerfis } = await supabaseAdmin.from("profiles")
    .select("id,nome").eq("tenant_id", tenantId).eq("ativo", true).in("id", usuarios.map(u => u.user_id));
  if (erroPerfis) throw erroPerfis;
  for (const perfil of perfis ?? []) {
    const { data: admin, error: erroAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: perfil.id, _role: "admin" });
    const { data: master, error: erroMaster } = await supabaseAdmin.rpc("eh_master", { _user_id: perfil.id });
    if (erroAdmin || erroMaster) throw erroAdmin ?? erroMaster;
    if (!admin && !master) continue;
    const tipos: ("diario" | "quinzena")[] = ["diario"];
    if (periodoCompleto(datas, periodo.inicio, periodo.fim)) tipos.push("quinzena");
    const { error: erroInsert } = await supabaseAdmin.from("notificacoes").upsert(tipos.map(tipo => ({
      tenant_id: tenantId, user_id: perfil.id, para_admin: false,
      tipo: tipo === "diario" ? "levantamento_diario" : "levantamento_quinzena",
      titulo: tipo === "diario" ? "Levantamento diário pronto" : "Levantamento da quinzena pronto",
      mensagem: mensagemLevantamentoPronto(perfil.nome, tipo),
      chave: tipo === "diario" ? `levantamento-diario-${dataReferencia}` : `levantamento-quinzena-${periodo.inicio}-${periodo.fim}`,
    })), { onConflict: "tenant_id,user_id,chave", ignoreDuplicates: true });
    if (erroInsert) throw erroInsert;
  }
  await enviarAvisosLevantamento();
}

/** Revalidate recipient and persisted report on device delivery. */
export async function avisoLevantamentoAtual(userId: string, id: string, agora = new Date()) {
  const { hora, semana } = agoraBrasilia(agora);
  if (semana === 0 || hora < 9 || hora >= 20) return null;
  const { data: perfil, error } = await supabaseAdmin.from("profiles")
    .select("nome,ativo,tenant_id,tenants(ativo,status)").eq("id", userId).maybeSingle();
  if (error) throw error;
  if (!perfil?.ativo || !perfil.tenants?.ativo || perfil.tenants.status !== "ativo") return null;
  const [permissao, admin, master] = await Promise.all([
    supabaseAdmin.rpc("tem_permissao", { _user_id: userId, _modulo: "levantamento_diario", _acao: "receber_notificacao" }),
    supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabaseAdmin.rpc("eh_master", { _user_id: userId }),
  ]);
  if (permissao.error || admin.error || master.error) throw new Error("Não foi possível validar o destinatário.");
  if (!permissao.data || (!admin.data && !master.data)) return null;
  const { data: aviso, error: erroAviso } = await supabaseAdmin.from("notificacoes")
    .select("tipo,chave,titulo,lida").eq("id", id).eq("user_id", userId).eq("tenant_id", perfil.tenant_id).maybeSingle();
  if (erroAviso) throw erroAviso;
  if (!aviso || aviso.lida) return null;
  const quinzenal = aviso.tipo === "levantamento_quinzena";
  const match = quinzenal ? aviso.chave?.match(/^levantamento-quinzena-(\d{4}-\d{2}-\d{2})-(\d{4}-\d{2}-\d{2})$/) : aviso.chave?.match(/^levantamento-diario-(\d{4}-\d{2}-\d{2})$/);
  const inicio = match?.[1];
  const fim = match?.[2] ?? inicio;
  if (!inicio || !fim || (!quinzenal && aviso.tipo !== "levantamento_diario")) return null;
  const { data: dias, error: erroDias } = await supabaseAdmin.from("levantamentos_diarios")
    .select("data_referencia").eq("tenant_id", perfil.tenant_id).gte("data_referencia", inicio).lte("data_referencia", fim);
  if (erroDias) throw erroDias;
  if (!periodoCompleto((dias ?? []).map(d => d.data_referencia), inicio, fim)) return null;
  return { tipo: `levantamento_pronto_${id}`, titulo: aviso.titulo, corpo: mensagemLevantamentoPronto(perfil.nome, quinzenal ? "quinzena" : "diario"), url: "/levantamento-diario" };
}

/** Existing hourly cron retries deferred events; one claim per report and recipient. */
export async function enviarAvisosLevantamento(agora = new Date()) {
  const { hora, semana } = agoraBrasilia(agora);
  if (semana === 0 || hora < 9 || hora >= 20) return;
  const { data: avisos, error } = await supabaseAdmin.from("notificacoes")
    .select("id,user_id,created_at").in("tipo", ["levantamento_diario", "levantamento_quinzena"])
    .eq("lida", false).gte("created_at", new Date(agora.getTime() - 7 * 86400000).toISOString()).limit(500);
  if (error) throw error;
  const { enviarAvisoPush } = await import("./push.server");
  for (const aviso of avisos ?? []) {
    if (!aviso.user_id) continue;
    const mensagem = await avisoLevantamentoAtual(aviso.user_id, aviso.id, agora);
    if (!mensagem) continue;
    const { data: dispositivos, error: erroDispositivos } = await supabaseAdmin.from("push_usuarios")
      .select("endpoint,mensagens").eq("user_id", aviso.user_id).eq("status", "ativa");
    if (erroDispositivos) throw erroDispositivos;
    if (!dispositivos?.length) continue;
    const dia = aviso.created_at.slice(0, 10);
    const { data: claim, error: erroClaim } = await supabaseAdmin.from("push_alertas_log")
      .upsert({ user_id: aviso.user_id, tipo: mensagem.tipo, dia }, { onConflict: "user_id,tipo,dia", ignoreDuplicates: true }).select("tipo");
    if (erroClaim) throw erroClaim;
    if (!claim?.length) continue;
    const endpoints: string[] = [];
    for (const dispositivo of dispositivos) {
      const fila = Array.isArray(dispositivo.mensagens) ? dispositivo.mensagens : [];
      const { error: erroFila } = await supabaseAdmin.from("push_usuarios")
        .update({ mensagens: [...fila, { tipo: mensagem.tipo, notificacaoId: aviso.id }], mensagens_em: agora.toISOString() })
        .eq("endpoint", dispositivo.endpoint).eq("user_id", aviso.user_id).eq("status", "ativa");
      if (!erroFila) endpoints.push(dispositivo.endpoint);
    }
    const resultado = await enviarAvisoPush(endpoints, 3600);
    if (!resultado.enviados) await supabaseAdmin.from("push_alertas_log").delete()
      .eq("user_id", aviso.user_id).eq("tipo", mensagem.tipo).eq("dia", dia);
  }
}