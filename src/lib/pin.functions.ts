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
      const falhas = (registro.falhas ?? 0) + 1;
      const espera = esperaMinutos(falhas, MAX_FALHAS, ESPERA_MIN);
      await supabaseAdmin
        .from("admin_pin")
        .update({
          falhas,
          bloqueado_ate:
            falhas >= MAX_FALHAS
              ? new Date(Date.now() + espera * 60_000).toISOString()
              : registro.bloqueado_ate,
        })
        .eq("id", true);
      throw new Error(
        falhas >= MAX_FALHAS
          ? `PIN incorreto. Tente novamente em ${espera >= 60 ? `${Math.round(espera / 60)}h` : `${espera} minutos`}.`
          : `PIN incorreto. Tente novamente. (tentativas restantes: ${MAX_FALHAS - falhas})`,
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

    const { gerarHashPin, pinForteValido } = await import("./pin.server");
    if (!pinForteValido(data.novo)) {
      throw new Error(
        "O PIN deve ter de 6 a 10 dígitos e não pode ser uma sequência (123456) nem dígitos repetidos (111111).",
      );
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("admin_pin")
      .upsert({ id: true, pin_hash: await gerarHashPin(data.novo), falhas: 0, bloqueado_ate: null });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
