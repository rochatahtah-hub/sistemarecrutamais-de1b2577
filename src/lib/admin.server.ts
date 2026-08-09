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