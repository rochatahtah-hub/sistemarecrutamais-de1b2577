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
    if (!perfil.ativo || !perfil.tenant_id) continue;
    const mensagens: { titulo: string; corpo: string; url: string; tipo: string }[] = [];

    for (const tipo of tipos) {
      if (enviadosHoje.has(`${perfil.id}:${tipo}`)) continue;
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
    if (mensagens.length === 0) continue;

    // Registra antes de enviar: se o envio repetir, o log impede duplicidade.
    const { data: gravados } = await supabaseAdmin
      .from("push_alertas_log")
      .upsert(
        mensagens.map((m) => ({ user_id: perfil.id, tipo: m.tipo, dia })),
        { onConflict: "user_id,tipo,dia", ignoreDuplicates: true },
      )
      .select("tipo");
    const novos = new Set((gravados ?? []).map((g) => g.tipo));
    const finais = mensagens.filter((m) => novos.has(m.tipo));
    if (finais.length === 0) continue;

    const endpoints = porUsuario.get(perfil.id) ?? [];
    await supabaseAdmin
      .from("push_usuarios")
      .update({ mensagens: finais, mensagens_em: new Date().toISOString() })
      .in("endpoint", endpoints);
    const r = await enviarAvisoPush(endpoints);
    enviados += r.enviados;
    if (r.invalidos.length > 0) {
      await supabaseAdmin.from("push_usuarios").update({ status: "invalida" }).in("endpoint", r.invalidos);
    }
  }
  return { usuarios: porUsuario.size, enviados, motivo: "ok" };
}

async function condicaoVerdadeira(
  db: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  tipo: TipoAlerta,
  userId: string,
  tenantId: string,
  dia: string,
  inicioDiaUtc: string,
): Promise<boolean> {
  const contar = async (q: PromiseLike<{ count: number | null }>) => ((await q).count ?? 0) > 0;
  const vagas = () =>
    db.from("vagas").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("programadora_id", userId);
  switch (tipo) {
    case "sem_vaga_hoje":
      return !(await contar(vagas().gte("created_at", inicioDiaUtc)));
    case "aguardando_confirmacao":
      return contar(vagas().eq("status", "AGUARDANDO").lt("data", dia));
    case "finalizar_programacoes":
      return contar(vagas().eq("status", "AGUARDANDO").eq("data", dia));
    case "atendimento_pendente":
      return contar(
        db
          .from("atendimento_conferencias")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("status_validacao", "PENDENTE"),
      );
  }
}
