import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Contexto = { supabase: { rpc: (n: "has_role", a: { _user_id: string; _role: "admin" }) => Promise<{ data: boolean | null }> }; userId: string };

async function exigirAdmin(context: Contexto) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Apenas o administrador pode gerenciar backups.");
}

/** Gera um backup manual no formato escolhido. */
export const gerarBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { formato: "sql" | "csv"; enviarEmail?: boolean }) => ({
    formato: d.formato === "csv" ? ("csv" as const) : ("sql" as const),
    enviarEmail: Boolean(d.enviarEmail),
  }))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context as unknown as Contexto);
    const { executarBackup, enviarBackupEmail } = await import("./backup.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: perfil } = await context.supabase
      .from("profiles")
      .select("nome")
      .eq("id", context.userId)
      .maybeSingle();
    const resultado = await executarBackup({
      formato: data.formato,
      origem: "manual",
      criadoPor: context.userId,
      criadoPorNome: perfil?.nome ?? "Administrador",
    });
    if (!data.enviarEmail) return { ...resultado, envio: null };
    const { data: agenda } = await supabaseAdmin
      .from("backup_agendamento")
      .select("email_destino")
      .eq("id", true)
      .maybeSingle();
    const envio = await enviarBackupEmail(
      resultado.id,
      agenda?.email_destino ?? "rochatahtah@gmail.com",
    );
    return { ...resultado, envio };
  });

/** Gera um link temporário de download para um backup concluído. */
export const linkDownloadBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context as unknown as Contexto);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: backup } = await supabaseAdmin
      .from("backups")
      .select("arquivo_path,arquivo_nome,status")
      .eq("id", data.id)
      .maybeSingle();
    if (!backup || backup.status !== "concluido" || !backup.arquivo_path) {
      throw new Error("Este backup não possui arquivo disponível.");
    }
    const { data: assinado, error } = await supabaseAdmin.storage
      .from("backups")
      .createSignedUrl(backup.arquivo_path, 300, { download: backup.arquivo_nome });
    if (error || !assinado) throw new Error(error?.message ?? "Falha ao gerar o link.");
    return { url: assinado.signedUrl, nome: backup.arquivo_nome };
  });

/** Exclui um backup (arquivo e histórico). */
export const excluirBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context as unknown as Contexto);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: backup } = await supabaseAdmin
      .from("backups")
      .select("arquivo_path")
      .eq("id", data.id)
      .maybeSingle();
    if (backup?.arquivo_path) {
      await supabaseAdmin.storage.from("backups").remove([backup.arquivo_path]);
    }
    await supabaseAdmin.from("backups").delete().eq("id", data.id);
    return { ok: true };
  });

/** Salva o agendamento da exportação automática. */
export const salvarAgendamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    ativo: boolean;
    frequencia: "diaria" | "semanal" | "mensal";
    hora: number;
    dia_semana: number;
    dia_mes: number;
    formato: "sql" | "csv";
    retencao_dias: number;
    email_destino?: string;
  }) => ({
    ativo: Boolean(d.ativo),
    frequencia: (["diaria", "semanal", "mensal"] as const).includes(d.frequencia)
      ? d.frequencia
      : ("diaria" as const),
    hora: Math.min(23, Math.max(0, Number(d.hora) || 0)),
    dia_semana: Math.min(6, Math.max(0, Number(d.dia_semana) || 0)),
    dia_mes: Math.min(28, Math.max(1, Number(d.dia_mes) || 1)),
    formato: d.formato === "csv" ? ("csv" as const) : ("sql" as const),
    retencao_dias: Math.min(365, Math.max(0, Number(d.retencao_dias) || 0)),
    email_destino: (d.email_destino ?? "rochatahtah@gmail.com").trim().slice(0, 200),
  }))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context as unknown as Contexto);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { calcularProximaExecucao } = await import("./backup.server");
    const { error } = await supabaseAdmin
      .from("backup_agendamento")
      .upsert({
        id: true,
        ...data,
        proxima_execucao: data.ativo ? calcularProximaExecucao(data) : null,
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });