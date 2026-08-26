import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PapelUsuario =
  "admin" | "programadora" | "supervisor" | "coordenador" | "comercial" | "rs" | "coordenador_rs";

const PAPEIS: PapelUsuario[] = [
  "admin",
  "programadora",
  "supervisor",
  "coordenador",
  "comercial",
  "rs",
  "coordenador_rs",
];

/**
 * "Nível de acesso" agora é só o Perfil (perfis_acesso). O papel técnico (user_roles), usado
 * pelas checagens grosseiras que já existiam (has_role admin, pode_operar no cliente), é
 * derivado da chave do perfil escolhido: perfis que já correspondem a um papel real mantêm o
 * mesmo comportamento de sempre; qualquer perfil novo (Líder, Faturamento, Atendimento,
 * Financeiro, ou outro customizado no futuro) cai em "comercial" — sem privilégio automático de
 * operar, acesso só pelas permissões granulares configuradas pra esse perfil.
 */
export function derivarRoleDoPerfil(chave: string | null | undefined): PapelUsuario {
  return PAPEIS.includes(chave as PapelUsuario) ? (chave as PapelUsuario) : "comercial";
}

/** Garante que a conta alvo pertence à empresa ativa de quem está administrando. */
async function garantirMesmaEmpresa(
  supabaseUsuario: { rpc: (n: "tenant_atual") => PromiseLike<{ data: string | null }> },
  userId: string,
) {
  const { data: tenantId } = await supabaseUsuario.rpc("tenant_atual");
  if (!tenantId) throw new Error("Não foi possível identificar a empresa ativa.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: perfil } = await supabaseAdmin
    .from("profiles")
    .select("id,tenant_id")
    .eq("id", userId)
    .maybeSingle();
  if (!perfil || perfil.tenant_id !== tenantId) {
    throw new Error("Usuário de outra empresa: acesso negado.");
  }
  return tenantId as string;
}

/** Cria um usuário com senha definida pelo administrador principal. */
export const criarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { nome: string; email: string; senha: string; perfilId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: ehAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!ehAdmin) throw new Error("Apenas o administrador pode cadastrar usuários.");
    if (!data.senha || data.senha.length < 6) throw new Error("A senha precisa ter 6+ caracteres.");
    if (!data.perfilId) throw new Error("Selecione o nível de acesso.");
    const { data: tenantId } = await context.supabase.rpc("tenant_atual");
    if (!tenantId) throw new Error("Não foi possível identificar a empresa ativa.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { normalizarEmail } = await import("./admin.server");
    const email = normalizarEmail(data.email);

    const { data: perfilEscolhido } = await supabaseAdmin
      .from("perfis_acesso")
      .select("chave")
      .eq("id", data.perfilId)
      .maybeSingle();
    const papel = derivarRoleDoPerfil(perfilEscolhido?.chave);

    const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { nome: data.nome.trim(), tenant_id: tenantId },
    });
    if (error || !criado.user)
      throw new Error(error?.message ?? "Não foi possível criar o acesso.");

    await supabaseAdmin.from("profiles").upsert(
      {
        id: criado.user.id,
        nome: data.nome.trim(),
        email,
        ativo: true,
        tenant_id: tenantId,
        perfil_id: data.perfilId,
      },
      { onConflict: "id" },
    );
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: criado.user.id, role: papel }, { onConflict: "user_id,role" });

    return { id: criado.user.id };
  });

/** Define uma nova senha para qualquer usuário. */
export const definirSenha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; senha: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: ehAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!ehAdmin) throw new Error("Apenas o administrador pode alterar senhas.");
    if (!data.senha || data.senha.length < 6) throw new Error("A senha precisa ter 6+ caracteres.");
    await garantirMesmaEmpresa(context.supabase, data.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.senha,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Define o nível de acesso (perfil) de um usuário existente, sincronizando o papel técnico por baixo. */
export const definirPermissao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; perfilId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: ehAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!ehAdmin) throw new Error("Apenas o administrador pode alterar permissões.");
    if (!data.perfilId) throw new Error("Selecione o nível de acesso.");
    await garantirMesmaEmpresa(context.supabase, data.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { EMAIL_ADMIN_PRINCIPAL, acharUsuarioPorEmail } = await import("./admin.server");

    const { data: perfilEscolhido } = await supabaseAdmin
      .from("perfis_acesso")
      .select("chave")
      .eq("id", data.perfilId)
      .maybeSingle();
    const papel = derivarRoleDoPerfil(perfilEscolhido?.chave);

    const principal = await acharUsuarioPorEmail(supabaseAdmin, EMAIL_ADMIN_PRINCIPAL);
    if (principal && principal.id === data.userId && papel !== "admin") {
      throw new Error("O administrador principal não pode perder o acesso.");
    }

    await supabaseAdmin.from("profiles").update({ perfil_id: data.perfilId }).eq("id", data.userId);
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.userId, role: papel }, { onConflict: "user_id,role" });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).neq("role", papel);
    return { ok: true };
  });
