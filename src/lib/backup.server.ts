import { strToU8, zipSync } from "fflate";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

type Tabela = keyof Database["public"]["Tables"];

/** Tabelas exportadas no backup. `admin_pin` fica de fora por conter hash de acesso. */
export const TABELAS_BACKUP = [
  "profiles",
  "user_roles",
  "colaboradores",
  "empresas",
  "candidatos",
  "colaboradores_bloqueados",
  "vagas",
  "importacoes",
  "configuracoes",
  "quinzenas_historico",
  "notificacoes",
  "alertas_operacao",
  "auditoria",
  "erros_sistema",
  "backups",
  "backup_agendamento",
] as const satisfies readonly Tabela[];

export type FormatoBackup = "sql" | "csv";
export type OrigemBackup = "manual" | "agendado";

type Linha = Record<string, unknown>;

const PAGINA = 1000;

/** Ids de usuários da empresa — usado nas tabelas que não têm coluna de empresa. */
async function usuariosDoTenant(tenantId: string): Promise<string[]> {
  const { data } = await supabaseAdmin.from("profiles").select("id").eq("tenant_id", tenantId);
  return (data ?? []).map((p) => p.id);
}

async function lerTabela(tabela: string, tenantId: string, idsUsuarios: string[]): Promise<Linha[]> {
  const linhas: Linha[] = [];
  for (let inicio = 0; ; inicio += PAGINA) {
    let consulta = supabaseAdmin
      .from(tabela as Tabela)
      .select("*")
      .range(inicio, inicio + PAGINA - 1) as unknown as {
      eq: (c: string, v: unknown) => unknown;
      in: (c: string, v: unknown[]) => unknown;
    };
    consulta = (tabela === "user_roles"
      ? consulta.in("user_id", idsUsuarios.length ? idsUsuarios : ["00000000-0000-0000-0000-000000000000"])
      : consulta.eq("tenant_id", tenantId)) as typeof consulta;
    const { data, error } = (await (consulta as unknown as Promise<unknown>)) as {
      data: Linha[] | null;
      error: { message: string } | null;
    };
    if (error) throw new Error(`Falha ao ler a tabela ${tabela}: ${error.message}`);
    const lote = (data ?? []) as Linha[];
    linhas.push(...lote);
    if (lote.length < PAGINA) break;
  }
  return linhas;
}

function valorSql(valor: unknown): string {
  if (valor === null || valor === undefined) return "NULL";
  if (typeof valor === "number") return Number.isFinite(valor) ? String(valor) : "NULL";
  if (typeof valor === "boolean") return valor ? "TRUE" : "FALSE";
  const texto = typeof valor === "object" ? JSON.stringify(valor) : String(valor);
  return `'${texto.replace(/'/g, "''")}'`;
}

function valorCsv(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  const texto = typeof valor === "object" ? JSON.stringify(valor) : String(valor);
  return /[",;\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function tabelaParaCsv(linhas: Linha[]): string {
  if (linhas.length === 0) return "";
  const colunas = Object.keys(linhas[0] as Linha);
  const corpo = linhas.map((l) => colunas.map((c) => valorCsv(l[c])).join(",")).join("\n");
  return `${colunas.join(",")}\n${corpo}\n`;
}

function tabelaParaSql(tabela: string, linhas: Linha[]): string {
  if (linhas.length === 0) return `-- ${tabela}: sem registros\n\n`;
  const colunas = Object.keys(linhas[0] as Linha);
  const inserts = linhas
    .map(
      (l) =>
        `INSERT INTO public.${tabela} (${colunas.join(", ")}) VALUES (${colunas
          .map((c) => valorSql(l[c]))
          .join(", ")}) ON CONFLICT DO NOTHING;`,
    )
    .join("\n");
  return `-- ${tabela} (${linhas.length} registros)\n${inserts}\n\n`;
}

export interface ArquivoBackup {
  nome: string;
  conteudo: Uint8Array;
  contentType: string;
  totalTabelas: number;
  totalRegistros: number;
}

function carimbo(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

/** Lê todas as tabelas do sistema e monta o arquivo de backup no formato pedido. */
export async function montarArquivoBackup(formato: FormatoBackup, tenantId: string): Promise<ArquivoBackup> {
  const dados: Array<{ tabela: string; linhas: Linha[] }> = [];
  const idsUsuarios = await usuariosDoTenant(tenantId);
  for (const tabela of TABELAS_BACKUP) {
    dados.push({ tabela, linhas: await lerTabela(tabela, tenantId, idsUsuarios) });
  }
  const totalRegistros = dados.reduce((s, d) => s + d.linhas.length, 0);

  if (formato === "sql") {
    const cabecalho =
      `-- Backup RECRUTA+\n-- Gerado em ${new Date().toISOString()}\n` +
      `-- Tabelas: ${dados.length} | Registros: ${totalRegistros}\n\nBEGIN;\n\n`;
    const corpo = dados.map((d) => tabelaParaSql(d.tabela, d.linhas)).join("");
    return {
      nome: `recrutamais-backup-${carimbo()}.sql`,
      conteudo: strToU8(`${cabecalho}${corpo}COMMIT;\n`),
      contentType: "application/sql",
      totalTabelas: dados.length,
      totalRegistros,
    };
  }

  const arquivos: Record<string, Uint8Array> = {};
  for (const d of dados) arquivos[`${d.tabela}.csv`] = strToU8(tabelaParaCsv(d.linhas));
  arquivos["_resumo.csv"] = strToU8(
    `tabela,registros\n${dados.map((d) => `${d.tabela},${d.linhas.length}`).join("\n")}\n`,
  );
  return {
    nome: `recrutamais-backup-${carimbo()}.zip`,
    conteudo: zipSync(arquivos, { level: 6 }),
    contentType: "application/zip",
    totalTabelas: dados.length,
    totalRegistros,
  };
}

/** Executa o backup ponta a ponta: registra o histórico, gera, envia ao Storage e conclui. */
export async function executarBackup(opcoes: {
  formato: FormatoBackup;
  origem: OrigemBackup;
  tenantId: string;
  criadoPor?: string | null;
  criadoPorNome?: string;
}) {
  const inicio = Date.now();
  if (!opcoes.tenantId) throw new Error("Empresa não identificada para o backup.");
  const { data: registro, error: erroRegistro } = await supabaseAdmin
    .from("backups")
    .insert({
      formato: opcoes.formato,
      origem: opcoes.origem,
      status: "processando",
      criado_por: opcoes.criadoPor ?? null,
      criado_por_nome: opcoes.criadoPorNome || "Sistema",
      tenant_id: opcoes.tenantId,
    })
    .select("id")
    .single();
  if (erroRegistro || !registro) {
    throw new Error(erroRegistro?.message ?? "Não foi possível registrar o backup.");
  }

  try {
    const arquivo = await montarArquivoBackup(opcoes.formato, opcoes.tenantId);
    const caminho = `${opcoes.tenantId}/${new Date().getFullYear()}/${arquivo.nome}`;
    const { error: erroUpload } = await supabaseAdmin.storage
      .from("backups")
      .upload(caminho, arquivo.conteudo, { contentType: arquivo.contentType, upsert: true });
    if (erroUpload) throw new Error(erroUpload.message);

    await supabaseAdmin
      .from("backups")
      .update({
        status: "concluido",
        arquivo_path: caminho,
        arquivo_nome: arquivo.nome,
        tamanho_bytes: arquivo.conteudo.byteLength,
        total_tabelas: arquivo.totalTabelas,
        total_registros: arquivo.totalRegistros,
        duracao_ms: Date.now() - inicio,
        concluido_em: new Date().toISOString(),
      })
      .eq("id", registro.id);

    return { id: registro.id, nome: arquivo.nome, tamanho: arquivo.conteudo.byteLength };
  } catch (e) {
    await supabaseAdmin
      .from("backups")
      .update({
        status: "falhou",
        erro: (e as Error).message.slice(0, 1000),
        duracao_ms: Date.now() - inicio,
        concluido_em: new Date().toISOString(),
      })
      .eq("id", registro.id);
    throw e;
  }
}

/** Remove backups mais antigos que a retenção configurada (arquivo + histórico). */
export async function aplicarRetencao(dias: number, tenantId: string) {
  if (!dias || dias <= 0) return 0;
  const limite = new Date(Date.now() - dias * 86_400_000).toISOString();
  const { data } = await supabaseAdmin
    .from("backups")
    .select("id,arquivo_path")
    .eq("tenant_id", tenantId)
    .lt("created_at", limite);
  const antigos = data ?? [];
  if (antigos.length === 0) return 0;
  const caminhos = antigos.map((b) => b.arquivo_path).filter(Boolean);
  if (caminhos.length > 0) await supabaseAdmin.storage.from("backups").remove(caminhos);
  await supabaseAdmin
    .from("backups")
    .delete()
    .in(
      "id",
      antigos.map((b) => b.id),
    );
  return antigos.length;
}

/** Fuso de Brasília (sem horário de verão desde 2019). */
const OFFSET_BRT = 3;

/** Converte a hora escolhida em Brasília para a hora correspondente em UTC. */
export function horaBrtParaUtc(hora: number): number {
  return (Math.min(23, Math.max(0, hora)) + OFFSET_BRT) % 24;
}

/** Calcula quando o agendamento deve rodar pela próxima vez (hora informada em Brasília). */
export function calcularProximaExecucao(
  agenda: { frequencia: string; hora: number; dia_semana: number; dia_mes: number },
  base = new Date(),
): string {
  const proxima = new Date(base);
  proxima.setUTCMinutes(0, 0, 0);
  proxima.setUTCHours(horaBrtParaUtc(agenda.hora));
  if (proxima <= base) proxima.setUTCDate(proxima.getUTCDate() + 1);

  if (agenda.frequencia === "semanal") {
    while (proxima.getUTCDay() !== agenda.dia_semana) {
      proxima.setUTCDate(proxima.getUTCDate() + 1);
    }
  } else if (agenda.frequencia === "mensal") {
    while (proxima.getUTCDate() !== Math.min(agenda.dia_mes, 28)) {
      proxima.setUTCDate(proxima.getUTCDate() + 1);
    }
  }
  return proxima.toISOString();
}

/** Gera um link assinado de download válido por 7 dias. */
async function linkTemporario(caminho: string, nome: string) {
  const { data } = await supabaseAdmin.storage
    .from("backups")
    .createSignedUrl(caminho, 7 * 86_400, { download: nome });
  return data?.signedUrl ?? "";
}

/**
 * Envia o backup ao e-mail configurado. Enquanto não houver domínio de e-mail
 * verificado no projeto, registra o link de download como notificação do administrador.
 */
export async function enviarBackupEmail(backupId: string, destino: string) {
  const { data: backup } = await supabaseAdmin
    .from("backups")
    .select("arquivo_path,arquivo_nome,tamanho_bytes,status,formato,tenant_id")
    .eq("id", backupId)
    .maybeSingle();

  if (!backup || backup.status !== "concluido" || !backup.arquivo_path) {
    return { enviado: false, motivo: "backup indisponível" };
  }

  const link = await linkTemporario(backup.arquivo_path, backup.arquivo_nome);
  const status = "pendente_dominio";

  await supabaseAdmin
    .from("backups")
    .update({ envio_status: status, envio_email: destino, envio_em: new Date().toISOString() })
    .eq("id", backupId);

  await supabaseAdmin.from("notificacoes").insert({
    tipo: "backup",
    titulo: "Backup concluído",
    mensagem: `Arquivo ${backup.arquivo_nome} pronto para ${destino}. Link de download (7 dias): ${link}`,
    para_admin: true,
    chave: `backup-${backupId}`,
    tenant_id: backup.tenant_id,
  });

  return { enviado: false, motivo: "e-mail do projeto ainda não configurado", link, status };
}

/** Roda o agendamento se estiver ativo e vencido. Usado pela rotina automática. */
export async function rodarAgendamento() {
  const { data: agendas } = await supabaseAdmin
    .from("backup_agendamento")
    .select("*")
    .eq("ativo", true);

  const resultados = [];
  for (const agenda of agendas ?? []) {
    resultados.push(await rodarAgendamentoDaEmpresa(agenda));
  }
  if (!resultados.length) return { executado: false, motivo: "agendamento inativo" };
  const executado = resultados.find((r) => r.executado);
  return executado ?? resultados[0]!;
}

type Agendamento = { [k: string]: unknown } & {
  ativo: boolean;
  tenant_id: string;
  formato: string;
  retencao_dias: number;
  email_destino: string;
  proxima_execucao: string | null;
  frequencia: string;
  hora: number;
  dia_semana: number;
  dia_mes: number;
};

/** Executa (se vencido) o agendamento de uma empresa específica. */
async function rodarAgendamentoDaEmpresa(agenda: Agendamento) {
  if (!agenda.ativo) return { executado: false, motivo: "agendamento inativo" };

  const agora = new Date();
  if (agenda.proxima_execucao && new Date(agenda.proxima_execucao) > agora) {
    return { executado: false, motivo: "ainda não é hora", proxima: agenda.proxima_execucao };
  }

  try {
    const resultado = await executarBackup({
      formato: (agenda.formato as FormatoBackup) ?? "sql",
      origem: "agendado",
      tenantId: agenda.tenant_id,
      criadoPorNome: "Rotina automática",
    });
    const removidos = await aplicarRetencao(agenda.retencao_dias, agenda.tenant_id);
    const envio = await enviarBackupEmail(resultado.id, agenda.email_destino);

    await supabaseAdmin
      .from("backup_agendamento")
      .update({
        ultima_execucao: agora.toISOString(),
        proxima_execucao: calcularProximaExecucao(agenda, agora),
        ultimo_envio_em: new Date().toISOString(),
        ultimo_envio_status: envio.enviado ? "enviado" : "pendente_dominio",
        ultimo_envio_erro: envio.enviado ? "" : String(envio.motivo ?? ""),
      })
      .eq("tenant_id", agenda.tenant_id);

    return { executado: true, ...resultado, removidos, envio };
  } catch (e) {
    const mensagem = (e as Error).message;
    await supabaseAdmin
      .from("backup_agendamento")
      .update({
        ultima_execucao: agora.toISOString(),
        proxima_execucao: calcularProximaExecucao(agenda, agora),
        ultimo_envio_status: "falhou",
        ultimo_envio_erro: mensagem.slice(0, 500),
      })
      .eq("tenant_id", agenda.tenant_id);
    await supabaseAdmin.from("notificacoes").insert({
      tipo: "backup",
      titulo: "Falha no backup automático",
      mensagem: mensagem.slice(0, 400),
      para_admin: true,
      chave: `backup-falha-${agora.toISOString().slice(0, 13)}`,
      tenant_id: agenda.tenant_id,
    });
    throw e;
  }
}