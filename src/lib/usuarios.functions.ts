import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function garantirAdmin(context: { supabase: { rpc: Function }; userId: string }) {
  const { data: ehAdmin } = await (context.supabase.rpc as (n: string, p: unknown) => Promise<{ data: boolean | null }>)(
    "has_role",
    { _user_id: context.userId, _role: "admin" },
  );
  if (!ehAdmin) throw new Error("Apenas o administrador pode executar esta ação.");
}

/** Lista os usuários com perfil, permissão, status e último acesso. */
export const listarUsuarios = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await garantirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: perfis }, { data: papeis }, auth] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id,nome,email,ativo,meta_quinzena,ultimo_acesso,last_login_at,ultimo_preenchimento,created_at")
        .order("nome"),
      supabaseAdmin.from("user_roles").select("user_id,role"),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
    ]);

    const banidos = new Map<string, boolean>();
    for (const u of auth.data?.users ?? []) {
      const meta = u as unknown as { id: string; banned_until?: string | null };
      banidos.set(meta.id, Boolean(meta.banned_until && new Date(meta.banned_until) > new Date()));
    }

    return (perfis ?? []).map((p) => ({
      id: p.id,
      nome: p.nome,
      email: p.email,
      ativo: p.ativo && !banidos.get(p.id),
      meta_quinzena: p.meta_quinzena,
      ultimo_acesso: p.ultimo_acesso,
      ultimo_login: p.last_login_at,
      ultima_atividade: p.ultimo_preenchimento,
      criado_em: p.created_at,
      admin: (papeis ?? []).some((r) => r.user_id === p.id && r.role === "admin"),
      papel: (["admin", "programadora", "supervisor", "coordenador", "comercial"] as const).find(
        (papel) => (papeis ?? []).some((r) => r.user_id === p.id && r.role === papel),
      ) ?? "programadora",
    }));
  });

/** Ativa ou desativa um usuário sem apagar o histórico dele. */
export const definirStatusUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; ativo: boolean }) => d)
  .handler(async ({ data, context }) => {
    await garantirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { EMAIL_ADMIN_PRINCIPAL, acharUsuarioPorEmail } = await import("./admin.server");

    if (!data.ativo) {
      const principal = await acharUsuarioPorEmail(supabaseAdmin, EMAIL_ADMIN_PRINCIPAL);
      if (principal?.id === data.userId) throw new Error("O administrador principal não pode ser desativado.");
      if (data.userId === context.userId) throw new Error("Você não pode desativar o próprio acesso.");
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.ativo ? "none" : "876000h",
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").update({ ativo: data.ativo }).eq("id", data.userId);
    await supabaseAdmin.from("auditoria").insert({
      tabela: "usuarios",
      registro_id: data.userId,
      acao: "UPDATE",
      descricao: "Status de acesso alterado",
      campo: "ativo",
      valor_anterior: data.ativo ? "false" : "true",
      valor_novo: data.ativo ? "true" : "false",
      usuario_id: context.userId,
      usuario_nome: "Administrador",
    });
    return { ok: true };
  });

/** Atualiza nome e e-mail de acesso do usuário. */
export const atualizarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; nome: string; email: string }) => d)
  .handler(async ({ data, context }) => {
    await garantirAdmin(context);
    if (data.nome.trim().length < 2) throw new Error("Informe o nome completo.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { normalizarEmail } = await import("./admin.server");
    const email = normalizarEmail(data.email);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Informe um e-mail válido.");

    const { data: anterior } = await supabaseAdmin
      .from("profiles")
      .select("nome,email")
      .eq("id", data.userId)
      .maybeSingle();

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      email,
      email_confirm: true,
      user_metadata: { nome: data.nome.trim() },
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("profiles")
      .update({ nome: data.nome.trim(), email })
      .eq("id", data.userId);
    await supabaseAdmin.from("auditoria").insert({
      tabela: "usuarios",
      registro_id: data.userId,
      acao: "UPDATE",
      descricao: `Cadastro de acesso atualizado: ${data.nome.trim()}`,
      campo: "nome",
      valor_anterior: `${anterior?.nome ?? ""} (${anterior?.email ?? ""})`,
      valor_novo: `${data.nome.trim()} (${email})`,
      usuario_id: context.userId,
      usuario_nome: "Administrador",
    });
    return { ok: true };
  });

/**
 * Exclui definitivamente o acesso. Os registros históricos (vagas, candidatos,
 * bloqueios, auditoria) permanecem gravados — apenas o vínculo é liberado.
 */
export const excluirUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    await garantirAdmin(context);
    if (data.userId === context.userId) throw new Error("Você não pode excluir o próprio acesso.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { EMAIL_ADMIN_PRINCIPAL, acharUsuarioPorEmail } = await import("./admin.server");
    const principal = await acharUsuarioPorEmail(supabaseAdmin, EMAIL_ADMIN_PRINCIPAL);
    if (principal?.id === data.userId) throw new Error("O administrador principal não pode ser excluído.");

    const { data: perfil } = await supabaseAdmin
      .from("profiles")
      .select("nome,email")
      .eq("id", data.userId)
      .maybeSingle();

    // Libera todos os vínculos históricos antes de excluir a identidade de acesso.
    const operacoes = await Promise.all([
      supabaseAdmin.from("vagas").update({ programadora_id: null }).eq("programadora_id", data.userId),
      supabaseAdmin.from("candidatos").update({ criado_por: null }).eq("criado_por", data.userId),
      supabaseAdmin.from("alertas_operacao").update({ resolvido_por: null }).eq("resolvido_por", data.userId),
      supabaseAdmin.from("auditoria").update({ usuario_id: null }).eq("usuario_id", data.userId),
      supabaseAdmin.from("backups").update({ criado_por: null }).eq("criado_por", data.userId),
      supabaseAdmin.from("colaboradores_bloqueados").update({ bloqueado_por: null }).eq("bloqueado_por", data.userId),
      supabaseAdmin.from("erros_sistema").update({ user_id: null }).eq("user_id", data.userId),
      supabaseAdmin.from("notificacoes").update({ user_id: null }).eq("user_id", data.userId),
      supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId),
    ]);
    const erroVinculo = operacoes.find((resultado) => resultado.error)?.error;
    if (erroVinculo) throw new Error(`Não foi possível preservar os vínculos históricos: ${erroVinculo.message}`);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(`Não foi possível excluir o acesso: ${error.message}`);

    // Remove o perfil caso o cascade não tenha sido aplicado.
    const { error: perfilErro } = await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    if (perfilErro) throw new Error(`Não foi possível remover o cadastro: ${perfilErro.message}`);

    const { data: restante } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", data.userId)
      .maybeSingle();
    if (restante) throw new Error("O acesso foi removido, mas o cadastro permaneceu. Tente novamente.");

    await supabaseAdmin.from("auditoria").insert({
      tabela: "usuarios",
      registro_id: null,
      acao: "DELETE",
      descricao: `Acesso removido: ${perfil?.nome ?? ""} (${perfil?.email ?? ""})`,
      campo: "",
      valor_anterior: perfil?.email ?? "",
      valor_novo: "",
      usuario_id: context.userId,
      usuario_nome: "Administrador",
    });
    return { ok: true };
  });