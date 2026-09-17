import { createServerFn } from "@tanstack/react-start";
import { erroSeguro } from "./erro-seguro";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_FALHAS = 5;
const ESPERA_MIN = 15;

/** Informa se já existe um PIN administrativo cadastrado. */
export const pinDefinido = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("admin_pin").select("id").maybeSingle();
  return { definido: Boolean(data) };
});

/** Valida o PIN e devolve a sessão do Administrador Principal. */
export const entrarComPin = createServerFn({ method: "POST" })
  .inputValidator((d: { pin: string }) => ({ pin: String(d.pin ?? "").trim() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { conferirPin, pinValido, esperaMinutos } = await import("./pin.server");
    const { criarSessaoAdminPrincipal } = await import("./admin.server");

    if (!pinValido(data.pin)) throw new Error("PIN inválido.");

    const { data: registro } = await supabaseAdmin
      .from("admin_pin")
      .select("pin_hash,falhas,bloqueado_ate")
      .maybeSingle();

    // Nenhum cadastro de "primeiro PIN" por visitantes: sem registro, o acesso é negado.
    // A definição/alteração do PIN só acontece por `alterarPin`, que exige sessão de administrador.
    if (!registro) {
      throw new Error(
        "Acesso administrativo indisponível: nenhum PIN cadastrado. Solicite ao administrador.",
      );
    }

    if (registro.bloqueado_ate && new Date(registro.bloqueado_ate) > new Date()) {
      throw new Error("Muitas tentativas incorretas. Tente novamente mais tarde.");
    }

    const ok = await conferirPin(data.pin, registro.pin_hash);
    if (!ok) {
      // Incremento atômico no banco (RPC) — evita que requisições em paralelo leiam o
      // mesmo valor de "falhas" e furem o limite de tentativas (race condition).
      const { data: resultado } = await supabaseAdmin.rpc("registrar_falha_pin");
      const falhas = resultado?.[0]?.falhas ?? (registro.falhas ?? 0) + 1;
      if (falhas >= MAX_FALHAS) {
        const espera = esperaMinutos(falhas, MAX_FALHAS, ESPERA_MIN);
        await supabaseAdmin
          .from("admin_pin")
          .update({ bloqueado_ate: new Date(Date.now() + espera * 60_000).toISOString() })
          .eq("id", true);
      }
      throw new Error("PIN incorreto. Tente novamente.");
    }

    await supabaseAdmin.from("admin_pin").update({ falhas: 0, bloqueado_ate: null }).eq("id", true);
    const tokens = await criarSessaoAdminPrincipal();
    return { ...tokens, primeiroAcesso: false };
  });

/** Permite ao administrador trocar o PIN. */
export const alterarPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { novo: string }) => ({ novo: String(d.novo ?? "").trim() }))
  .handler(async ({ data, context }) => {
    // Este PIN dá acesso à sessão da conta administradora principal da plataforma
    // inteira (todos os tenants) — só quem já é super-admin pode alterá-lo. `has_role`
    // é uma flag global (sem tenant_id): um administrador comum de qualquer empresa
    // cliente também recebe `role: 'admin'`, então usá-lo aqui permitiria que qualquer
    // cliente assumisse a conta principal.
    const { data: ehSuperAdmin } = await context.supabase.rpc("eh_super_admin", {
      _user_id: context.userId,
    });
    if (!ehSuperAdmin) throw new Error("Apenas a administradora principal pode alterar este PIN.");

    const { gerarHashPin, pinForteValido } = await import("./pin.server");
    if (!pinForteValido(data.novo)) {
      throw new Error(
        "O PIN deve ter de 6 a 10 dígitos e não pode ser uma sequência (123456) nem dígitos repetidos (111111).",
      );
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("admin_pin").upsert({
      id: true,
      pin_hash: await gerarHashPin(data.novo),
      falhas: 0,
      bloqueado_ate: null,
    });
    if (error) throw erroSeguro(error, "alterarPin");
    return { ok: true };
  });
