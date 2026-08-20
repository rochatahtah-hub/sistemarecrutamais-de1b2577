import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PapelUsuario =
  | "admin"
  | "programadora"
  | "supervisor"
  | "coordenador"
  | "comercial"
  | "rs"
  | "coordenador_rs";

const PAPEIS: PapelUsuario[] = [
  "admin",
  "programadora",
  "supervisor",
  "coordenador",
  "comercial",
  "rs",
  "coordenador_rs",
];

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
  .inputValidator(
    (d: {
      nome: string;
      email: string;
      senha: string;
      papel?: PapelUsuario;
      perfilId?: string | null;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { data: ehAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!ehAdmin) throw new Error("Apenas o administrador pode cadastrar usuários.");
    if (!data.senha || data.senha.length < 6) throw new Error("A senha precisa ter 6+ caracteres.");
    const { data: tenantId } = await context.supabase.rpc("tenant_atual");
    if (!tenantId) throw new Error("Não foi possível identificar a empresa ativa.");
    const papel: PapelUsuario = PAPEIS.includes(data.papel as PapelUsuario)
      ? (data.papel as PapelUsuario)
      : "programadora";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { normalizarEmail } = await import("./admin.server");
    const email = normalizarEmail(data.email);

    const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { nome: data.nome.trim(), tenant_id: tenantId },
    });
    if (error || !criado.user) throw new Error(error?.message ?? "Não foi possível criar o acesso.");

    await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: criado.user.id,
          nome: data.nome.trim(),
          email,
          ativo: true,
          tenant_id: tenantId,
          funcao_id: data.funcaoId || null,
        },
        { onConflict: "id" },
      );
    await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: criado.user.id, role: papel },
        { onConflict: "user_id,role" },
      );

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

/** Define o papel único de um usuário (admin, programadora, supervisor, coordenador, comercial, R&S ou coordenador de R&S). */
export const definirPermissao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; papel: PapelUsuario }) => d)
  .handler(async ({ data, context }) => {
    const { data: ehAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!ehAdmin) throw new Error("Apenas o administrador pode alterar permissões.");
    if (!PAPEIS.includes(data.papel)) throw new Error("Perfil inválido.");
    await garantirMesmaEmpresa(context.supabase, data.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { EMAIL_ADMIN_PRINCIPAL, acharUsuarioPorEmail } = await import("./admin.server");
    const principal = await acharUsuarioPorEmail(supabaseAdmin, EMAIL_ADMIN_PRINCIPAL);
    if (principal && principal.id === data.userId && data.papel !== "admin") {
      throw new Error("O administrador principal não pode perder o acesso.");
    }

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.userId, role: data.papel }, { onConflict: "user_id,role" });
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .neq("role", data.papel);
    return { ok: true };
  });