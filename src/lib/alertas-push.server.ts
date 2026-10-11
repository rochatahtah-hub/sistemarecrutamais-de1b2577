import { REGRAS_ALERTA, agoraNoFuso, limitesDiaNoFuso, type TipoAlerta } from "./alertas-push";
import { mensagemSemanal } from "./push-semanal";

/**
 * Avalia as condições reais de cada usuário inscrito e envia push.
 * Respeita: usuário ativo, permissão (tem_permissao), tenant do usuário,
 * dia local e no máximo um alerta de cada tipo por dia (push_alertas_log).
 */
export async function rodarAlertasPush(agora = new Date()) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { enviarAvisosLevantamento } = await import("./levantamento-aviso.server");
  await enviarAvisosLevantamento(agora);

  const tipos = Object.keys(REGRAS_ALERTA) as TipoAlerta[];

  const { data: inscricoes, error: erroInscricoes } = await supabaseAdmin
    .from("push_usuarios")
    .select("user_id,endpoint")
    .eq("status", "ativa")
    .limit(5000);
  if (erroInscricoes) throw new Error("Não foi possível verificar as inscrições.");
  const porUsuario = new Map<string, string[]>();
  for (const i of inscricoes ?? []) {
    porUsuario.set(i.user_id, [...(porUsuario.get(i.user_id) ?? []), i.endpoint]);
  }
  if (porUsuario.size === 0) return { usuarios: 0, enviados: 0, motivo: "sem inscritos" };

  const { data: tenants, error: erroTenants } = await supabaseAdmin.from("tenants")
    .select("id,fuso_horario").eq("ativo", true).eq("status", "ativo");
  if (erroTenants) throw new Error("Não foi possível verificar as empresas dos alertas.");
  const tenantsAtivos = new Set((tenants ?? []).map((t) => t.id));

  const { data: perfis, error: erroPerfis } = await supabaseAdmin
    .from("profiles")
    .select("id,tenant_id,ativo,fuso_horario")
    .in("id", [...porUsuario.keys()]);
  if (erroPerfis) throw new Error("Não foi possível verificar os destinatários.");

  const { enviarAvisoPush } = await import("./push.server");
  let enviados = 0;

  for (const perfil of perfis ?? []) {
    if (!perfil.ativo || !perfil.tenant_id || !tenantsAtivos.has(perfil.tenant_id)) continue;
    const fuso = perfil.fuso_horario ?? tenants?.find(t => t.id === perfil.tenant_id)?.fuso_horario;
    const { dia } = agoraNoFuso(agora, fuso);
    const { data: jaEnviados, error: erroLog } = await supabaseAdmin.from("push_alertas_log")
      .select("tipo").eq("user_id", perfil.id).eq("dia", dia);
    if (erroLog) throw new Error("Não foi possível verificar duplicidades.");
    const enviadosHoje = new Set((jaEnviados ?? []).map(l => l.tipo));
    let operacionaisVerificados = true;
    let mensagens: { titulo: string; corpo: string; url: string; tipo: string; dia?: string }[] = [];
    try {
      mensagens = await alertasAtuaisDoUsuario(supabaseAdmin, perfil.id, tipos, agora);
    } catch {
      // Weekly greetings do not depend on the operational query succeeding.
      operacionaisVerificados = false;
    }
    const semanal = mensagemSemanal(agora, fuso);
    if (semanal) mensagens.push(semanal);
    // Refresh pending state even for already-notified users: resolved items
    // must not remain queued merely because today's dedup claim exists.
    const { data: dispositivos, error: erroDispositivos } = await supabaseAdmin.from("push_usuarios")
      .select("endpoint,mensagens,mensagens_em").eq("user_id", perfil.id).eq("status", "ativa");
    if (erroDispositivos) throw new Error("Não foi possível atualizar os alertas pendentes.");
    const ativos = new Set(mensagens.map((m) => m.tipo));
    const filasAtuais = new Map<string, typeof dispositivos>();
    for (const dispositivo of dispositivos ?? []) {
      if (!Array.isArray(dispositivo.mensagens)) continue;
      const validas = dispositivo.mensagens.filter((m) => m && typeof m === "object" && !Array.isArray(m) && typeof m['tipo'] === "string" && (m['tipo'] === 'teste_dispositivo' || m['tipo'].startsWith('levantamento_pronto_') || ativos.has(m['tipo']) || (!operacionaisVerificados && Object.hasOwn(REGRAS_ALERTA, m['tipo']))));
      filasAtuais.set(dispositivo.endpoint, [{ ...dispositivo, mensagens: validas }]);
      if (validas.length === dispositivo.mensagens.length) continue;
      let limpeza = supabaseAdmin.from("push_usuarios").update({ mensagens: validas }).eq("endpoint", dispositivo.endpoint);
      if (dispositivo.mensagens_em) limpeza = limpeza.eq("mensagens_em", dispositivo.mensagens_em);
      const { error } = await limpeza;
      if (error) throw new Error("Não foi possível limpar os alertas resolvidos.");
    }
    const naoEnviadas = mensagens.filter((m) => !enviadosHoje.has(m.tipo));
    if (naoEnviadas.length === 0) {
      // Provider acceptance is not display. Wake devices with an unacknowledged
      // live batch again, without replacing its ID or extending its lifetime.
      const pendentes = [...filasAtuais.values()].flatMap(fila => fila ?? []).filter(d => {
        if (!d.mensagens_em || !Array.isArray(d.mensagens) || d.mensagens.length === 0) return false;
        const idade = agora.getTime() - new Date(d.mensagens_em).getTime();
        return idade >= 0 && idade < 2 * 3600 * 1000;
      }).map(d => d.endpoint);
      if (pendentes.length > 0) {
        const tentativa = await enviarAvisoPush(pendentes, 3600);
        enviados += tentativa.enviados;
        if (tentativa.invalidos.length > 0) await supabaseAdmin.from("push_usuarios")
          .update({ status: "invalida" }).in("endpoint", tentativa.invalidos);
      }
      continue;
    }

    // Registra antes de enviar: se o envio repetir, o log impede duplicidade.
    const { data: gravados, error: erroClaim } = await supabaseAdmin
      .from("push_alertas_log")
       .upsert(
        naoEnviadas.map((m) => ({ user_id: perfil.id, tipo: m.tipo, dia })),
        { onConflict: "user_id,tipo,dia", ignoreDuplicates: true },
      )
      .select("tipo");
    if (erroClaim) throw new Error("Não foi possível reservar o envio sem duplicidades.");
    const novos = new Set((gravados ?? []).map((g) => g.tipo));
    const finais = naoEnviadas.filter((m) => novos.has(m.tipo));
    if (finais.length === 0) continue;

    const endpoints = porUsuario.get(perfil.id) ?? [];
    const preservadas = new Map<string, { [key: string]: import("@/integrations/supabase/types").Json | undefined }>();
    for (const dispositivo of dispositivos ?? []) {
      if (!Array.isArray(dispositivo.mensagens)) continue;
      for (const m of dispositivo.mensagens) {
        if (!m || typeof m !== "object" || Array.isArray(m) || typeof m["tipo"] !== "string") continue;
        if (!novos.has(m["tipo"]) && (m["tipo"] === "teste_dispositivo" || m["tipo"].startsWith("levantamento_pronto_") || ativos.has(m["tipo"]) || (!operacionaisVerificados && Object.hasOwn(REGRAS_ALERTA, m["tipo"])))) preservadas.set(m["tipo"], m);
      }
    }
    const { error: erroFila } = await supabaseAdmin
      .from("push_usuarios")
      .update({ mensagens: [...preservadas.values(), ...finais], mensagens_em: agora.toISOString() })
      .in("endpoint", endpoints).eq("user_id", perfil.id).eq("status", "ativa");
    if (erroFila) {
      await supabaseAdmin.from("push_alertas_log").delete().eq("user_id", perfil.id)
        .eq("dia", dia).in("tipo", finais.map((m) => m.tipo));
      throw new Error("Não foi possível preparar os alertas para envio.");
    }
    const r = await enviarAvisoPush(endpoints, 3600);
    // A total failure did not deliver anything: allow the next scheduled run
    // to retry. Keep the claim if even one device accepted the push.
    if (r.enviados === 0) {
      await supabaseAdmin.from("push_alertas_log").delete().eq("user_id", perfil.id)
        .eq("dia", dia).in("tipo", finais.map((m) => m.tipo));
    }
    enviados += r.enviados;
    if (r.invalidos.length > 0) {
      await supabaseAdmin.from("push_usuarios").update({ status: "invalida" }).in("endpoint", r.invalidos);
    }
  }
  return { usuarios: porUsuario.size, enviados, motivo: "ok" };
}

export async function condicaoVerdadeira(
  db: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  tipo: TipoAlerta,
  userId: string,
  tenantId: string,
  dia: string,
  inicioDiaUtc: string,
  fimDiaUtc = new Date(new Date(inicioDiaUtc).getTime() + 86400000).toISOString(),
): Promise<boolean> {
  const contar = async (q: PromiseLike<{ count: number | null; error: unknown }>) => {
    const { count, error } = await q;
    if (error || count === null) throw new Error("Não foi possível verificar a condição do alerta.");
    return (count ?? 0) > 0;
  };
  const vagas = () =>
    db.from("vagas").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("programadora_id", userId);
  switch (tipo) {
    case "sem_vaga_hoje":
      return !(await contar(vagas().gte("created_at", inicioDiaUtc).lt("created_at", fimDiaUtc)));
    case "aguardando_confirmacao":
      return contar(vagas().eq("status", "AGUARDANDO").lte("data", dia));
    case "finalizar_programacoes":
      return contar(vagas().eq("status", "AGUARDANDO").eq("data", dia));
    case "atendimento_pendente":
      return contar(
        db
          .from("atendimento_conferencias")
          .select("id,vagas!inner(id)", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("vagas.tenant_id", tenantId)
          .eq("vagas.programadora_id", userId)
          .in("vagas.status", ["PRESENCA", "FALTA", "CANCELAMENTO"])
          .eq("status_validacao", "PENDENTE"),
      );
  }
}

/** Re-check identity, permissions and live conditions at the last delivery step. */
export async function alertasAtuaisDoUsuario(
  db: Parameters<typeof condicaoVerdadeira>[0],
  userId: string,
  candidatos: TipoAlerta[],
  agora = new Date(),
) {
  const { data: perfil, error } = await db.from("profiles")
    .select("ativo,tenant_id,fuso_horario,tenants(ativo,status,fuso_horario)").eq("id", userId).maybeSingle();
  if (error) throw new Error("Não foi possível verificar o usuário do alerta.");
  if (!perfil?.ativo || !perfil.tenant_id || !perfil.tenants?.ativo || perfil.tenants.status !== "ativo") return [];
  const fuso = perfil.fuso_horario ?? perfil.tenants.fuso_horario;
  const { dia } = agoraNoFuso(agora, fuso);
  const { inicio, fim } = limitesDiaNoFuso(dia, fuso);
  const mensagens = [];
  for (const tipo of new Set(candidatos)) {
    const regra = REGRAS_ALERTA[tipo];
    const { data: pode, error: erroPermissao } = await db.rpc("tem_permissao", {
      _user_id: userId, _modulo: regra.modulo, _acao: regra.acao,
    });
    if (erroPermissao) throw new Error("Não foi possível verificar a permissão do alerta.");
    if (!pode || !(await condicaoVerdadeira(db, tipo, userId, perfil.tenant_id, dia, inicio, fim))) continue;
    mensagens.push({ tipo, titulo: regra.titulo, corpo: regra.corpo, url: regra.url });
  }
  return mensagens;
}
