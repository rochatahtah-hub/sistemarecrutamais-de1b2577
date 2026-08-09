import { createServerFn } from "@tanstack/react-start";
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
    const { conferirPin, gerarHashPin, pinValido } = await import("./pin.server");
    const { criarSessaoAdminPrincipal } = await import("./admin.server");

    if (!pinValido(data.pin)) throw new Error("O PIN deve ter de 4 a 8 dígitos.");

    const { data: registro } = await supabaseAdmin
      .from("admin_pin")
      .select("pin_hash,falhas,bloqueado_ate")
      .maybeSingle();

    if (!registro) {
      await supabaseAdmin
        .from("admin_pin")
        .upsert({ id: true, pin_hash: await gerarHashPin(data.pin), falhas: 0, bloqueado_ate: null });
      const tokens = await criarSessaoAdminPrincipal();
      return { ...tokens, primeiroAcesso: true };
    }

    if (registro.bloqueado_ate && new Date(registro.bloqueado_ate) > new Date()) {
      throw new Error("Muitas tentativas incorretas. Tente novamente mais tarde.");
    }

    const ok = await conferirPin(data.pin, registro.pin_hash);
    if (!ok) {
      const falhas = (registro.falhas ?? 0) + 1;
      await supabaseAdmin
        .from("admin_pin")
        .update({
          falhas,
          bloqueado_ate:
            falhas >= MAX_FALHAS
              ? new Date(Date.now() + ESPERA_MIN * 60_000).toISOString()
              : registro.bloqueado_ate,
        })
        .eq("id", true);
      throw new Error(
        falhas >= MAX_FALHAS
          ? `PIN incorreto. Acesso bloqueado por ${ESPERA_MIN} minutos.`
          : `PIN incorreto. Tentativas restantes: ${MAX_FALHAS - falhas}.`,
      );
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
    const { data: ehAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!ehAdmin) throw new Error("Apenas o administrador pode alterar o PIN.");

    const { gerarHashPin, pinValido } = await import("./pin.server");
    if (!pinValido(data.novo)) throw new Error("O PIN deve ter de 4 a 8 dígitos.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("admin_pin")
      .upsert({ id: true, pin_hash: await gerarHashPin(data.novo), falhas: 0, bloqueado_ate: null });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
