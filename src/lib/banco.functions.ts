import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ENTIDADES, entidadePorChave } from "@/lib/banco-entidades";

type Acao = "visualizar" | "criar" | "editar" | "excluir" | "exportar" | "administrar";

interface Contexto {
  supabase: {
    rpc: (nome: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
    from: (t: string) => {
      select: (c: string) => {
        eq: (c: string, v: unknown) => { maybeSingle: () => Promise<{ data: { nome?: string } | null }> };
      };
    };
  };
  userId: string;
}

async function exigir(context: unknown, acao: Acao) {
  const ctx = context as Contexto;
  const { data } = await ctx.supabase.rpc("tem_permissao", {
    _user_id: ctx.userId,
    _modulo: "banco_dados",
    _acao: acao,
  });
  if (data !== true) throw new Error("Seu perfil não tem permissão para esta operação no banco de dados.");
  return ctx;
}

async function nomeUsuario(ctx: Contexto) {
  const { data } = await ctx.supabase.from("profiles").select("nome").eq("id", ctx.userId).maybeSingle();
  return data?.nome ?? "Administrador";
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as {
    from: (t: string) => any;
    storage: { from: (b: string) => any };
  };
}

function texto(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v).slice(0, 500);
}

/** Panorama geral do banco: volumes, atualização, backups e status. */
export const panoramaBanco = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigir(context, "visualizar");
    const db = await admin();
    const contagens: { chave: string; nome: string; total: number }[] = [];
    for (const ent of ENTIDADES) {
      const { count } = await db.from(ent.tabela).select("id", { count: "exact", head: true });
      contagens.push({ chave: ent.chave, nome: ent.nome, total: count ?? 0 });
    }
    const [ultimasVagas, ultimoBackup, ultimoDrive] = await Promise.all([
      db.from("vagas").select("id,data,cargo,status,updated_at").order("updated_at", { ascending: false }).limit(5),
      db
        .from("backups")
        .select("created_at,arquivo_nome,tamanho_bytes,status,criado_por_nome")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from("backups")
        .select("drive_em,arquivo_nome,drive_link")
        .eq("drive_status", "enviado")
        .order("drive_em", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const { data: somaBackups } = await db.from("backups").select("tamanho_bytes");
    const armazenamentoBackups = (somaBackups ?? []).reduce(
      (s: number, b: { tamanho_bytes: number | null }) => s + (b.tamanho_bytes ?? 0),
      0,
    );

    return {
      conectado: true,
      entidades: contagens,
      totalRegistros: contagens.reduce((s, c) => s + c.total, 0),
      totalEntidades: contagens.length,
      ultimosRegistros: ultimasVagas.data ?? [],
      ultimaAtualizacao: ultimasVagas.data?.[0]?.updated_at ?? null,
      ultimoBackup: ultimoBackup.data ?? null,
      ultimoBackupDrive: ultimoDrive.data ?? null,
      armazenamentoBackups,
    };
  });

/** Lista registros de uma entidade com busca e paginação. */
export const listarRegistros = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { entidade: string; busca?: string; status?: string; pagina?: number }) => ({
    entidade: String(d.entidade),
    busca: String(d.busca ?? "").trim().slice(0, 120),
    status: String(d.status ?? ""),
    pagina: Math.max(0, Number(d.pagina ?? 0)),
  }))
  .handler(async ({ data, context }) => {
    await exigir(context, "visualizar");
    const ent = entidadePorChave(data.entidade);
    if (!ent) throw new Error("Entidade não disponível.");
    const db = await admin();
    const porPagina = 25;
    const colunas = ["id", ...ent.campos.map((c) => c.chave)].join(",");
    let q = db
      .from(ent.tabela)
      .select(colunas, { count: "exact" })
      .order(ent.ordem, { ascending: false })
      .range(data.pagina * porPagina, data.pagina * porPagina + porPagina - 1);

    const termo = data.busca.replace(/[%,()]/g, " ").trim();
    if (termo && ent.busca.length) {
      q = q.or(ent.busca.map((c) => `${c}.ilike.%${termo}%`).join(","));
    }
    if (data.status && ent.filtroStatus) q = q.eq(ent.filtroStatus.coluna, data.status);

    const { data: linhas, count, error } = await q;
    if (error) throw new Error(error.message);
    return { linhas: (linhas ?? []) as Record<string, unknown>[], total: count ?? 0, porPagina };
  });

/** Atualiza campos permitidos de um registro, com auditoria. */
export const atualizarRegistro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { entidade: string; id: string; campos: Record<string, unknown> }) => ({
    entidade: String(d.entidade),
    id: String(d.id),
    campos: (d.campos ?? {}) as Record<string, unknown>,
  }))
  .handler(async ({ data, context }) => {
    const ctx = await exigir(context, "editar");
    const ent = entidadePorChave(data.entidade);
    if (!ent) throw new Error("Entidade não disponível.");
    if (ent.somenteLeitura) throw new Error("Esta entidade é somente leitura (histórico protegido).");

    const editaveis = new Set(ent.campos.filter((c) => c.editavel).map((c) => c.chave));
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data.campos)) if (editaveis.has(k)) patch[k] = v;
    if (!Object.keys(patch).length) throw new Error("Nenhum campo editável foi informado.");

    const db = await admin();
    const { data: antes } = await db.from(ent.tabela).select("*").eq("id", data.id).maybeSingle();
    if (!antes) throw new Error("Registro não encontrado.");
    const { error } = await db.from(ent.tabela).update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);

    const nome = await nomeUsuario(ctx);
    const linhas = Object.entries(patch)
      .filter(([k, v]) => texto((antes as Record<string, unknown>)[k]) !== texto(v))
      .map(([k, v]) => ({
        tabela: ent.tabela,
        registro_id: data.id,
        acao: "UPDATE",
        descricao: texto((antes as Record<string, unknown>)["nome"] ?? (antes as Record<string, unknown>)["full_name"] ?? ""),
        campo: k,
        valor_anterior: texto((antes as Record<string, unknown>)[k]),
        valor_novo: texto(v),
        usuario_id: ctx.userId,
        usuario_nome: nome,
      }));
    if (linhas.length) await db.from("auditoria").insert(linhas);
    return { ok: true, alterados: linhas.length };
  });

/** Arquiva/desativa um registro (alternativa segura à exclusão). */
export const arquivarRegistro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { entidade: string; id: string; arquivar: boolean }) => ({
    entidade: String(d.entidade),
    id: String(d.id),
    arquivar: Boolean(d.arquivar),
  }))
  .handler(async ({ data, context }) => {
    const ctx = await exigir(context, "editar");
    const ent = entidadePorChave(data.entidade);
    if (!ent?.arquivar) throw new Error("Esta entidade não permite arquivamento.");
    const db = await admin();
    const valor = data.arquivar ? ent.arquivar.inativo : ent.arquivar.ativo;
    const { data: antes } = await db.from(ent.tabela).select("*").eq("id", data.id).maybeSingle();
    const { error } = await db.from(ent.tabela).update({ [ent.arquivar.coluna]: valor }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await db.from("auditoria").insert({
      tabela: ent.tabela,
      registro_id: data.id,
      acao: "UPDATE",
      descricao: texto((antes as Record<string, unknown> | null)?.["nome"] ?? (antes as Record<string, unknown> | null)?.["full_name"] ?? ""),
      campo: ent.arquivar.coluna,
      valor_anterior: texto((antes as Record<string, unknown> | null)?.[ent.arquivar.coluna]),
      valor_novo: texto(valor),
      usuario_id: ctx.userId,
      usuario_nome: await nomeUsuario(ctx),
    });
    return { ok: true };
  });

/** Verifica dependências antes de excluir um registro. */
export const dependenciasRegistro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { entidade: string; id: string }) => ({ entidade: String(d.entidade), id: String(d.id) }))
  .handler(async ({ data, context }) => {
    await exigir(context, "visualizar");
    const ent = entidadePorChave(data.entidade);
    if (!ent) throw new Error("Entidade não disponível.");
    const db = await admin();
    const itens: { rotulo: string; total: number }[] = [];
    for (const dep of ent.dependencias ?? []) {
      const { count } = await db
        .from(dep.tabela)
        .select("id", { count: "exact", head: true })
        .eq(dep.coluna, data.id);
      if ((count ?? 0) > 0) itens.push({ rotulo: dep.rotulo, total: count ?? 0 });
    }
    return { itens, podeArquivar: Boolean(ent.arquivar), protegida: Boolean(ent.protegida) };
  });

/** Exclui definitivamente um registro, com confirmação explícita e auditoria. */
export const excluirRegistro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { entidade: string; id: string; confirmacao: string }) => ({
    entidade: String(d.entidade),
    id: String(d.id),
    confirmacao: String(d.confirmacao ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const ctx = await exigir(context, "excluir");
    const ent = entidadePorChave(data.entidade);
    if (!ent) throw new Error("Entidade não disponível.");
    if (ent.somenteLeitura || ent.protegida) {
      throw new Error("Registros históricos e usuários não podem ser excluídos por esta área. Use arquivar/desativar.");
    }
    if (data.confirmacao.trim().toUpperCase() !== "EXCLUIR") {
      throw new Error('Digite EXCLUIR para confirmar a remoção definitiva.');
    }
    const db = await admin();
    for (const dep of ent.dependencias ?? []) {
      const { count } = await db
        .from(dep.tabela)
        .select("id", { count: "exact", head: true })
        .eq(dep.coluna, data.id);
      if ((count ?? 0) > 0) {
        throw new Error(
          `Este registro possui ${count} ${dep.rotulo} vinculadas. Arquive o registro para preservar o histórico.`,
        );
      }
    }
    const { data: antes } = await db.from(ent.tabela).select("*").eq("id", data.id).maybeSingle();
    const { error } = await db.from(ent.tabela).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await db.from("auditoria").insert({
      tabela: ent.tabela,
      registro_id: data.id,
      acao: "DELETE",
      descricao: texto((antes as Record<string, unknown> | null)?.["nome"] ?? (antes as Record<string, unknown> | null)?.["full_name"] ?? ""),
      campo: "",
      valor_anterior: "",
      valor_novo: "",
      usuario_id: ctx.userId,
      usuario_nome: await nomeUsuario(ctx),
    });
    return { ok: true };
  });

/** Histórico de alterações administrativas recentes. */
export const auditoriaBanco = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { entidade?: string }) => ({ entidade: String(d?.entidade ?? "") }))
  .handler(async ({ data, context }) => {
    await exigir(context, "visualizar");
    const db = await admin();
    let q = db
      .from("auditoria")
      .select("id,created_at,usuario_nome,tabela,acao,descricao,campo,valor_anterior,valor_novo")
      .order("created_at", { ascending: false })
      .limit(50);
    const ent = data.entidade ? entidadePorChave(data.entidade) : null;
    if (ent) q = q.eq("tabela", ent.tabela);
    const { data: linhas, error } = await q;
    if (error) throw new Error(error.message);
    return (linhas ?? []) as Record<string, unknown>[];
  });
