import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";
const PASTA = "Recruta+ — Backups";

interface Ctx {
  supabase: { rpc: (n: string, a: Record<string, unknown>) => Promise<{ data: unknown }> };
  userId: string;
}

async function exigirPermissao(context: unknown, acao: "visualizar" | "criar" | "administrar") {
  const ctx = context as Ctx;
  const { data } = await ctx.supabase.rpc("tem_permissao", {
    _user_id: ctx.userId,
    _modulo: "banco_dados",
    _acao: acao,
  });
  if (data !== true) throw new Error("Seu perfil não tem permissão para enviar backups ao Google Drive.");
  return ctx;
}

function credenciais() {
  const lovable = process.env["LOVABLE_API_KEY"];
  const conexao = process.env["GOOGLE_DRIVE_API_KEY"];
  return { lovable, conexao, conectado: Boolean(lovable && conexao) };
}

function cabecalhos(extra: Record<string, string> = {}) {
  const { lovable, conexao } = credenciais();
  return {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": String(conexao),
    ...extra,
  };
}

async function chamar(caminho: string, init?: RequestInit) {
  const resposta = await fetch(`${GATEWAY}${caminho}`, {
    ...init,
    headers: { ...cabecalhos(), ...(init?.headers as Record<string, string> | undefined) },
  });
  if (!resposta.ok) {
    const corpo = await resposta.text();
    throw new Error(`Google Drive respondeu ${resposta.status}: ${corpo.slice(0, 300)}`);
  }
  return resposta;
}

async function pastaDeBackups() {
  const busca = new URLSearchParams({
    q: `name = '${PASTA}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id,name)",
    pageSize: "1",
  });
  const existente = (await (await chamar(`/drive/v3/files?${busca}`)).json()) as {
    files?: { id: string }[];
  };
  if (existente.files?.length) return existente.files[0]!.id;

  const criada = (await (
    await chamar("/drive/v3/files?fields=id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: PASTA, mimeType: "application/vnd.google-apps.folder" }),
    })
  ).json()) as { id: string };
  return criada.id;
}

/** Informa se a integração com o Google Drive está disponível. */
export const statusDrive = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirPermissao(context, "visualizar");
    const { conectado } = credenciais();
    if (!conectado) return { conectado: false, conta: "" };
    try {
      const info = (await (await chamar("/drive/v3/about?fields=user(emailAddress)")).json()) as {
        user?: { emailAddress?: string };
      };
      return { conectado: true, conta: info.user?.emailAddress ?? "" };
    } catch {
      return { conectado: false, conta: "" };
    }
  });

/** Copia um backup já gerado para a pasta "Recruta+ — Backups" no Google Drive. */
export const enviarBackupDrive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; forcar?: boolean }) => ({
    id: String(d.id),
    forcar: Boolean(d.forcar),
  }))
  .handler(async ({ data, context }) => {
    await exigirPermissao(context, "criar");
    const { conectado } = credenciais();
    if (!conectado) {
      throw new Error(
        "O Google Drive ainda não está conectado ao Recruta+. Conecte a conta na área de Backups para enviar arquivos.",
      );
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tenantId } = await (context.supabase.rpc as unknown as (n: string) => Promise<{ data: string | null }>)(
      "tenant_atual",
    );
    if (!tenantId) throw new Error("Não foi possível identificar a empresa ativa.");
    const { data: backup } = await supabaseAdmin
      .from("backups")
      .select("arquivo_path,arquivo_nome,status,drive_status,drive_link")
      .eq("tenant_id", tenantId)
      .eq("id", data.id)
      .maybeSingle();
    if (!backup || backup.status !== "concluido" || !backup.arquivo_path) {
      throw new Error("Este backup não possui arquivo disponível para envio.");
    }
    if (backup.drive_status === "enviado" && !data.forcar) {
      return { jaEnviado: true, link: backup.drive_link };
    }

    const { data: arquivo, error: erroArquivo } = await supabaseAdmin.storage
      .from("backups")
      .download(backup.arquivo_path);
    if (erroArquivo || !arquivo) throw new Error("Não foi possível ler o arquivo do backup.");

    try {
      const pasta = await pastaDeBackups();
      const limite = `recrutaplus${Date.now().toString(36)}`;
      const metadados = JSON.stringify({ name: backup.arquivo_nome, parents: [pasta] });
      const conteudo = new Uint8Array(await arquivo.arrayBuffer());
      const cabecalho = new TextEncoder().encode(
        `--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadados}\r\n--${limite}\r\nContent-Type: application/octet-stream\r\n\r\n`,
      );
      const rodape = new TextEncoder().encode(`\r\n--${limite}--\r\n`);
      const corpo = new Uint8Array(cabecalho.length + conteudo.length + rodape.length);
      corpo.set(cabecalho, 0);
      corpo.set(conteudo, cabecalho.length);
      corpo.set(rodape, cabecalho.length + conteudo.length);

      const enviado = (await (
        await chamar("/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
          method: "POST",
          headers: { "Content-Type": `multipart/related; boundary=${limite}` },
          body: corpo,
        })
      ).json()) as { id: string; webViewLink?: string };

      const agora = new Date().toISOString();
      await supabaseAdmin
        .from("backups")
        .update({
          drive_status: "enviado",
          drive_file_id: enviado.id,
          drive_link: enviado.webViewLink ?? `https://drive.google.com/file/d/${enviado.id}/view`,
          drive_em: agora,
          drive_erro: "",
        })
        .eq("id", data.id);

      return {
        jaEnviado: false,
        link: enviado.webViewLink ?? `https://drive.google.com/file/d/${enviado.id}/view`,
        em: agora,
      };
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : "Falha ao enviar para o Google Drive.";
      await supabaseAdmin
        .from("backups")
        .update({ drive_status: "erro", drive_erro: mensagem.slice(0, 500) })
        .eq("id", data.id);
      throw new Error(mensagem);
    }
  });
