import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cpfValido } from "./diarias";
import { diaPublicacaoAtual, motivoIndisponibilidade } from "./oportunidade-disponibilidade";

const LIMITE_CURRICULO = 8 * 1024 * 1024;
const TIPOS_CURRICULO = ["application/pdf", "image/jpeg", "image/png"];

function texto(valor: unknown, max: number) {
  return String(valor ?? "").trim().slice(0, max);
}

function digitos(valor: unknown, max: number) {
  return String(valor ?? "").replace(/\D+/g, "").slice(0, max);
}

async function empresaAtiva(slug: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("id,nome,slug")
    .eq("slug", slug)
    .eq("ativo", true)
    .eq("status", "ativo")
    .maybeSingle();
  if (error) throw new Error("Falha ao carregar os dados da empresa.");
  return data ?? null;
}

const CAMPOS_PUBLICOS = "id,modalidade,tipo_diaria,titulo,data_oportunidade,descricao,requisitos,informacoes_adicionais,curriculo_obrigatorio,genero,cidade,bairro,horario_inicio,horario_fim,transporte_tipo,transporte_detalhes";
const CAMPOS_VERIFICACAO = CAMPOS_PUBLICOS + ",status,vaga_id,vaga:vagas(tenant_id,situacao,status,genero,cidade,bairro,horario_inicio,horario_fim,transporte_tipo,transporte_detalhes)";
interface AnuncioRow {
  id: string; modalidade: "especifica" | "clt"; tipo_diaria: string; titulo: string;
  data_oportunidade: string | null; descricao: string; requisitos: string; informacoes_adicionais: string;
  curriculo_obrigatorio: boolean; status: string; vaga_id: string | null;
  genero: string | null; cidade: string | null; bairro: string | null; horario_inicio: string | null;
  horario_fim: string | null; transporte_tipo: string | null; transporte_detalhes: string | null;
  vaga: (Omit<AnuncioRow, "vaga"> & { tenant_id: string; situacao: string }) | null;
}

async function configuracaoPublica(tenantId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("captacao_config")
    .select("diarias_ativa,oportunidades_ativa,clt_ativa").eq("tenant_id", tenantId).maybeSingle();
  if (error) throw new Error("Não foi possível carregar as oportunidades.");
  return { diarias_ativa: data?.diarias_ativa ?? true, oportunidades_ativa: data?.oportunidades_ativa ?? false, clt_ativa: data?.clt_ativa ?? false };
}

function anuncioPublico(o: AnuncioRow) {
  // Projeção explícita: estado operacional, vínculo, tenant e candidatos nunca saem do servidor.
  return {
    id: o.id, modalidade: o.modalidade, tipo_diaria: o.tipo_diaria,
    titulo: o.titulo, data_oportunidade: o.data_oportunidade, descricao: o.descricao,
    requisitos: o.requisitos, informacoes_adicionais: o.informacoes_adicionais,
    curriculo_obrigatorio: o.curriculo_obrigatorio,
    genero: o.genero ?? o.vaga?.genero ?? null, cidade: o.cidade ?? o.vaga?.cidade ?? null,
    bairro: o.bairro ?? o.vaga?.bairro ?? null,
    horario_inicio: (o.horario_inicio ?? o.vaga?.horario_inicio)?.slice(0, 5) ?? null,
    horario_fim: (o.horario_fim ?? o.vaga?.horario_fim)?.slice(0, 5) ?? null,
    transporte_tipo: o.transporte_tipo ?? o.vaga?.transporte_tipo ?? null,
    transporte_detalhes: o.transporte_detalhes ?? o.vaga?.transporte_detalhes ?? null,
    vaga: null,
  };
}

export async function carregarPortalPublico({ slug }: { slug: string }) {
  const empresa = await empresaAtiva(slug);
  if (!empresa) return null;
  const config = await configuracaoPublica(empresa.id);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("captacao_oportunidades")
    .select(CAMPOS_VERIFICACAO).eq("tenant_id", empresa.id).eq("status", "ativa")
    .order("data_oportunidade", { ascending: true }).limit(1000);
  if (error) throw new Error("Não foi possível carregar as oportunidades.");
  const oportunidades = ((data ?? []) as unknown as AnuncioRow[])
    .filter(o => (!o.vaga || o.vaga.tenant_id === empresa.id) && !motivoIndisponibilidade(o, config, diaPublicacaoAtual()))
    .map(anuncioPublico);
  return { empresa, modalidades: { diarias: config.diarias_ativa, oportunidades: config.oportunidades_ativa, clt: config.clt_ativa }, oportunidades };
}

export const portalCaptacaoPublico = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: texto(d?.slug, 80).toLowerCase() }))
  .handler(({ data }) => carregarPortalPublico(data));

export async function carregarOportunidadePublica({ slug, id }: { slug: string; id: string }) {
  const empresa = await empresaAtiva(slug);
  if (!empresa) return { empresa: null, oportunidade: null, motivo: "Este link não está disponível." };
  const config = await configuracaoPublica(empresa.id);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("captacao_oportunidades")
    .select(CAMPOS_VERIFICACAO).eq("tenant_id", empresa.id).eq("id", id).maybeSingle();
  if (error) throw new Error("Não foi possível carregar a vaga.");
  const o = data as unknown as AnuncioRow | null;
  const motivo = o ? motivoIndisponibilidade(o, config, diaPublicacaoAtual()) : "Esta oportunidade não está disponível.";
  if (!o || motivo || (o.vaga && o.vaga.tenant_id !== empresa.id))
    return { empresa, oportunidade: null, motivo: motivo ?? "Esta oportunidade não está disponível." };
  return { empresa, oportunidade: anuncioPublico(o), motivo: null };
}

export const oportunidadePublica = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string; id: string }) => z.object({ slug: z.string().trim().min(1).max(80), id: z.string().uuid() }).parse(d))
  .handler(({ data }) => carregarOportunidadePublica(data));

export interface EnvioCandidatura {
  slug: string;
  oportunidadeId: string;
  nome: string;
  telefone: string;
  cpf: string;
  cidade: string;
  bairro: string;
  curriculo?: { nome: string; tipo: string; base64: string } | null;
}

/** Candidatura pública em oportunidade específica ou vaga CLT. */
export const candidatarPublico = createServerFn({ method: "POST" })
  .inputValidator((d: EnvioCandidatura) => ({
    slug: texto(d?.slug, 80).toLowerCase(),
    oportunidadeId: texto(d?.oportunidadeId, 40),
    nome: texto(d?.nome, 120),
    telefone: digitos(d?.telefone, 11),
    cpf: digitos(d?.cpf, 11),
    cidade: texto(d?.cidade, 80),
    bairro: texto(d?.bairro, 80),
    curriculo: d?.curriculo
      ? {
          nome: texto(d.curriculo.nome, 160),
          tipo: texto(d.curriculo.tipo, 80),
          base64: String(d.curriculo.base64 ?? ""),
        }
      : null,
  }))
  .handler(async ({ data }) => {
    if (data.nome.length < 3 || data.telefone.length < 10 || !cpfValido(data.cpf) || data.cidade.length < 2) {
      throw new Error("Confira os dados informados antes de enviar.");
    }
    const empresa = await empresaAtiva(data.slug);
    if (!empresa) throw new Error("Este cadastro não está disponível no momento.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const anuncio = await carregarOportunidadePublica({ slug: data.slug, id: data.oportunidadeId });
    const oportunidade = anuncio.oportunidade;
    if (!oportunidade) throw new Error(anuncio.motivo ?? "Esta oportunidade não está mais disponível.");

    if (oportunidade.curriculo_obrigatorio && !data.curriculo?.base64) {
      throw new Error("Esta vaga exige o envio do currículo.");
    }

    // Reaproveita o colaborador já existente (mesmo CPF na mesma empresa).
    const { data: existente } = await supabaseAdmin
      .from("daily_workers")
      .select("id")
      .eq("tenant_id", empresa.id)
      .eq("cpf", data.cpf)
      .maybeSingle();

    let colaboradorId = existente?.id ?? null;
    if (!colaboradorId) {
      const { data: criado, error: erroCriar } = await supabaseAdmin
        .from("daily_workers")
        .insert({
          tenant_id: empresa.id,
          full_name: data.nome,
          phone: data.telefone,
          cpf: data.cpf,
          city: data.cidade,
          neighborhood: data.bairro,
          available_for_daily: oportunidade.modalidade !== "clt",
          available_days: [],
          available_periods: [],
          desired_role: "",
          status: "novo",
          consent_accepted: true,
          consent_date: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (erroCriar) throw new Error("Não foi possível concluir a candidatura. Tente novamente.");
      colaboradorId = criado.id;
    }

    const { data: jaInscrito } = await supabaseAdmin
      .from("captacao_candidaturas")
      .select("id")
      .eq("oportunidade_id", oportunidade.id)
      .eq("daily_worker_id", colaboradorId)
      .maybeSingle();
    // Situação esperada (não é erro): a pessoa já se cadastrou nesta oportunidade.
    if (jaInscrito) return { ok: false as const, motivo: "duplicado" as const };

    let curriculoPath = "";
    let curriculoNome = "";
    if (data.curriculo?.base64) {
      if (!TIPOS_CURRICULO.includes(data.curriculo.tipo)) {
        throw new Error("Envie o currículo em PDF, JPG ou PNG.");
      }
      const binario = Buffer.from(data.curriculo.base64, "base64");
      if (binario.byteLength > LIMITE_CURRICULO) throw new Error("O currículo deve ter até 8 MB.");
      const ext = (data.curriculo.nome.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const caminho = `${empresa.id}/${oportunidade.id}/${colaboradorId}-${Date.now()}.${ext || "pdf"}`;
      const { error: erroUpload } = await supabaseAdmin.storage
        .from("curriculos")
        .upload(caminho, binario, { contentType: data.curriculo.tipo, upsert: false });
      if (erroUpload) throw new Error("Não foi possível enviar o currículo. Tente novamente.");
      curriculoPath = caminho;
      curriculoNome = data.curriculo.nome;
    }

    const { error } = await supabaseAdmin.from("captacao_candidaturas").insert({
      tenant_id: empresa.id,
      oportunidade_id: oportunidade.id,
      daily_worker_id: colaboradorId,
      nome: data.nome,
      cpf: data.cpf,
      telefone: data.telefone,
      curriculo_path: curriculoPath,
      curriculo_nome: curriculoNome,
      status: "ativa",
    });
    if (error) {
      console.error("[captacao] falha ao registrar candidatura", error.message);
      throw new Error("Não foi possível concluir a candidatura. Tente novamente.");
    }

    return { ok: true as const, motivo: null };
  });
