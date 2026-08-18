import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** E-mail da conta administrativa principal usada pelo fluxo de PIN já existente. */
export const EMAIL_ADMIN_PRINCIPAL = "rochatahtah@gmail.com";

export function normalizarEmail(email: string) {
  return (email ?? "").trim().toLowerCase();
}

/** Cliente publicável no servidor, usado apenas para validar o token de acesso temporário. */
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
 * Cria uma sessão temporária para a conta administrativa principal sem alterar sua senha.
 * Só deve ser chamada após a validação do PIN administrativo.
 */
export async function criarSessaoAdminPrincipal() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const existente = await acharUsuarioPorEmail(supabaseAdmin, EMAIL_ADMIN_PRINCIPAL);
  if (!existente) throw new Error("Conta administrativa não encontrada.");

  const [{ data: perfil }, { data: papel }] = await Promise.all([
    supabaseAdmin
    .from("profiles")
      .select("ativo,tenant_id")
      .eq("id", existente.id)
      .maybeSingle(),
    supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", existente.id)
      .eq("role", "admin")
      .maybeSingle(),
  ]);
  if (!perfil?.ativo || !perfil.tenant_id || !papel) {
    throw new Error("Conta administrativa sem vínculo ativo ou permissão administrativa.");
  }

  const { data: link, error: erroLink } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: EMAIL_ADMIN_PRINCIPAL,
  });
  if (erroLink || !link.properties?.hashed_token) {
    throw new Error(erroLink?.message ?? "Não foi possível autorizar a sessão administrativa.");
  }

  const { data: sessao, error: erroLogin } = await clientePublico().auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: "email",
  });
  if (erroLogin || !sessao.session || sessao.user?.id !== existente.id) {
    throw new Error(erroLogin?.message ?? "Não foi possível iniciar a sessão do administrador.");
  }
  return {
    access_token: sessao.session.access_token,
    refresh_token: sessao.session.refresh_token,
  };
}