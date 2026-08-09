import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** E-mail da conta administrativa principal (acesso direto, sem senha). */
export const EMAIL_ADMIN_PRINCIPAL = "rochatahtah@gmail.com";

export function normalizarEmail(email: string) {
  return (email ?? "").trim().toLowerCase();
}

/** Cliente publicável no servidor, usado apenas para gerar a sessão de login. */
export function clientePublico() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

type AdminClient = Awaited<
  ReturnType<typeof import("@/integrations/supabase/client.server")["supabaseAdmin"]["auth"]["admin"]["listUsers"]>
>;

/** Busca um usuário do Auth pelo e-mail percorrendo as páginas da Admin API. */
export async function acharUsuarioPorEmail(
  admin: { auth: { admin: { listUsers: (o: { page: number; perPage: number }) => Promise<AdminClient> } } },
  email: string,
) {
  const alvo = normalizarEmail(email);
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const achado = data.users.find((u) => normalizarEmail(u.email ?? "") === alvo);
    if (achado) return achado;
    if (data.users.length < 200) break;
  }
  return null;
}

/**
 * Garante a conta administrativa principal e devolve os tokens de sessão.
 * Só deve ser chamada após a validação do PIN administrativo.
 */
export async function criarSessaoAdminPrincipal() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const senha = process.env["ADMIN_MASTER_PASSWORD"]!;
  const existente = await acharUsuarioPorEmail(supabaseAdmin, EMAIL_ADMIN_PRINCIPAL);

  let userId: string;
  if (existente) {
    userId = existente.id;
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: senha,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: EMAIL_ADMIN_PRINCIPAL,
      password: senha,
      email_confirm: true,
      user_metadata: { nome: "Administrador Principal" },
    });
    if (error || !data.user) throw new Error(error?.message ?? "Falha ao criar administrador.");
    userId = data.user.id;
  }

  const { data: perfil } = await supabaseAdmin
    .from("profiles")
    .select("id,nome")
    .eq("id", userId)
    .maybeSingle();
  await supabaseAdmin.from("profiles").upsert(
    {
      id: userId,
      nome: perfil?.nome ?? "Administrador Principal",
      email: EMAIL_ADMIN_PRINCIPAL,
      ativo: true,
    },
    { onConflict: "id" },
  );
  await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

  const { data: sessao, error: erroLogin } = await clientePublico().auth.signInWithPassword({
    email: EMAIL_ADMIN_PRINCIPAL,
    password: senha,
  });
  if (erroLogin || !sessao.session) {
    throw new Error(erroLogin?.message ?? "Não foi possível iniciar a sessão do administrador.");
  }
  return {
    access_token: sessao.session.access_token,
    refresh_token: sessao.session.refresh_token,
  };
}