import { REGRAS_ALERTA, agoraBrasilia, alertaNoHorario, type TipoAlerta } from "./alertas-push";

/**
 * Avalia as condições reais de cada usuário inscrito e envia push.
 * Respeita: usuário ativo, permissão (tem_permissao), tenant do usuário,
 * janela de horário e no máximo um alerta de cada tipo por dia (push_alertas_log).
 */
export async function rodarAlertasPush(agora = new Date()) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { dia, hora, semana } = agoraBrasilia(agora);
  const inicioDiaUtc = `${dia}T03:00:00.000Z`;

  const { enviarAvisosLevantamento } = await import("./levantamento-aviso.server");
  await enviarAvisosLevantamento(agora);

  const tipos = (Object.keys(REGRAS_ALERTA) as TipoAlerta[]).filter((t) =>
    alertaNoHorario(t, hora, semana),
  );
  if (tipos.length === 0) return { usuarios: 0, enviados: 0, motivo: "fora do horário" };

  const { data: inscricoes } = await supabaseAdmin
    .from("push_usuarios")
    .select("user_id,endpoint")
    .eq("status", "ativa")
    .limit(5000);
  const porUsuario = new Map<string, string[]>();
  for (const i of inscricoes ?? []) {
    porUsuario.set(i.user_id, [...(porUsuario.get(i.user_id) ?? []), i.endpoint]);
  }
  if (porUsuario.size === 0) return { usuarios: 0, enviados: 0, motivo: "sem inscritos" };

  const { data: tenants, error: erroTenants } = await supabaseAdmin.from("tenants")
    .select("id").eq("ativo", true).eq("status", "ativo");
  if (erroTenants) throw new Error("Não foi possível verificar as empresas dos alertas.");
  const tenantsAtivos = new Set((tenants ?? []).map((t) => t.id));

  const { data: perfis } = await supabaseAdmin
    .from("profiles")
    .select("id,tenant_id,ativo")
    .in("id", [...porUsuario.keys()]);
  const { data: jaEnviados } = await supabaseAdmin
    .from("push_alertas_log")
    .select("user_id,tipo")
    .eq("dia", dia)
    .in("user_id", [...porUsuario.keys()]);
  const enviadosHoje = new Set((jaEnviados ?? []).map((l) => `${l.user_id}:${l.tipo}`));

  const { enviarAvisoPush } = await import("./push.server");
  let enviados = 0;

  for (const perfil of perfis ?? []) {
    if (!perfil.ativo || !perfil.tenant_id || !tenantsAtivos.has(perfil.tenant_id)) continue;
    const mensagens: { titulo: string; corpo: string; url: string; tipo: string }[] = [];

    for (const tipo of tipos) {
      const regra = REGRAS_ALERTA[tipo];
      const { data: pode } = await supabaseAdmin.rpc("tem_permissao", {
        _user_id: perfil.id,
        _modulo: regra.modulo,
        _acao: regra.acao,
      });
      if (!pode) continue;
      if (!(await condicaoVerdadeira(supabaseAdmin, tipo, perfil.id, perfil.tenant_id, dia, inicioDiaUtc)))
        continue;
      mensagens.push({ titulo: regra.titulo, corpo: regra.corpo, url: regra.url, tipo });
    }
    // Refresh pending state even for already-notified users: resolved items
    // must not remain queued merely because today's dedup claim exists.
    const { data: dispositivos, error: erroDispositivos } = await supabaseAdmin.from("push_usuarios")
      .select("endpoint,mensagens,mensagens_em").eq("user_id", perfil.id).eq("status", "ativa");
    if (erroDispositivos) throw new Error("Não foi possível atualizar os alertas pendentes.");
    const ativos = new Set(mensagens.map((m) => m.tipo));
    for (const dispositivo of dispositivos ?? []) {
      if (!Array.isArray(dispositivo.mensagens)) continue;
      const validas = dispositivo.mensagens.filter((m) => m && typeof m === "object" && !Array.isArray(m) && typeof m['tipo'] === "string" && (m['tipo'].startsWith('levantamento_pronto_') || ativos.has(m['tipo'])));
      if (validas.length === dispositivo.mensagens.length) continue;
      let limpeza = supabaseAdmin.from("push_usuarios").update({ mensagens: validas }).eq("endpoint", dispositivo.endpoint);
      if (dispositivo.mensagens_em) limpeza = limpeza.eq("mensagens_em", dispositivo.mensagens_em);
      const { error } = await limpeza;
      if (error) throw new Error("Não foi possível limpar os alertas resolvidos.");
    }
    const naoEnviadas = mensagens.filter((m) => !enviadosHoje.has(`${perfil.id}:${m.tipo}`));
    if (naoEnviadas.length === 0) continue;

    // Registra antes de enviar: se o envio repetir, o log impede duplicidade.
    const { data: gravados } = await supabaseAdmin
      .from("push_alertas_log")
      .upsert(
        naoEnviadas.map((m) => ({ user_id: perfil.id, tipo: m.tipo, dia })),
        { onConflict: "user_id,tipo,dia", ignoreDuplicates: true },
      )
      .select("tipo");
    const novos = new Set((gravados ?? []).map((g) => g.tipo));
    const finais = naoEnviadas.filter((m) => novos.has(m.tipo));
    if (finais.length === 0) continue;

    const endpoints = porUsuario.get(perfil.id) ?? [];
    const { error: erroFila } = await supabaseAdmin
      .from("push_usuarios")
      .update({ mensagens: [...(dispositivos ?? []).flatMap(d => Array.isArray(d.mensagens) ? d.mensagens.filter(m => m && typeof m === "object" && !Array.isArray(m) && typeof m["tipo"] === "string" && m["tipo"].startsWith("levantamento_pronto_")) : []), ...finais], mensagens_em: new Date().toISOString() })
      .in("endpoint", endpoints);
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
      return !(await contar(vagas().gte("created_at", inicioDiaUtc).lt("created_at", new Date(new Date(inicioDiaUtc).getTime() + 86400000).toISOString())));
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
  const { dia, hora, semana } = agoraBrasilia(agora);
  const { data: perfil, error } = await db.from("profiles")
    .select("ativo,tenant_id,tenants(ativo,status)").eq("id", userId).maybeSingle();
  if (error) throw new Error("Não foi possível verificar o usuário do alerta.");
  if (!perfil?.ativo || !perfil.tenant_id || !perfil.tenants?.ativo || perfil.tenants.status !== "ativo") return [];
  const mensagens = [];
  for (const tipo of new Set(candidatos)) {
    const regra = REGRAS_ALERTA[tipo];
    if (!alertaNoHorario(tipo, hora, semana)) continue;
    const { data: pode, error: erroPermissao } = await db.rpc("tem_permissao", {
      _user_id: userId, _modulo: regra.modulo, _acao: regra.acao,
    });
    if (erroPermissao) throw new Error("Não foi possível verificar a permissão do alerta.");
    if (!pode || !(await condicaoVerdadeira(db, tipo, userId, perfil.tenant_id, dia, `${dia}T03:00:00.000Z`))) continue;
    mensagens.push({ tipo, titulo: regra.titulo, corpo: regra.corpo, url: regra.url });
  }
  return mensagens;
}
