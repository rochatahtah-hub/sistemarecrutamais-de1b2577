import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Cria um usuário com senha definida pelo administrador principal. */
export const criarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { nome: string; email: string; senha: string; admin?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { data: ehAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!ehAdmin) throw new Error("Apenas o administrador pode cadastrar usuários.");
    if (!data.senha || data.senha.length < 6) throw new Error("A senha precisa ter 6+ caracteres.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { normalizarEmail } = await import("./admin.server");
    const email = normalizarEmail(data.email);

    const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { nome: data.nome.trim() },
    });
    if (error || !criado.user) throw new Error(error?.message ?? "Não foi possível criar o acesso.");

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: criado.user.id, nome: data.nome.trim(), email, ativo: true }, { onConflict: "id" });
    await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: criado.user.id, role: data.admin ? "admin" : "programadora" },
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.senha,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Concede ou remove o perfil de administrador. */
export const definirPermissao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; admin: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { data: ehAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!ehAdmin) throw new Error("Apenas o administrador pode alterar permissões.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { EMAIL_ADMIN_PRINCIPAL, acharUsuarioPorEmail } = await import("./admin.server");
    const principal = await acharUsuarioPorEmail(supabaseAdmin, EMAIL_ADMIN_PRINCIPAL);
    if (principal && principal.id === data.userId && !data.admin) {
      throw new Error("O administrador principal não pode perder o acesso.");
    }

    if (data.admin) {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "programadora");
    } else {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "programadora" }, { onConflict: "user_id,role" });
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
    }
    return { ok: true };
  });