import { createServerFn } from "@tanstack/react-start";

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

/** Modalidades ativas e oportunidades abertas do link público. */
export const portalCaptacaoPublico = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: texto(d?.slug, 80).toLowerCase() }))
  .handler(async ({ data }) => {
    if (!data.slug) return null;
    const empresa = await empresaAtiva(data.slug);
    if (!empresa) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: config } = await supabaseAdmin
      .from("captacao_config")
      .select("diarias_ativa,oportunidades_ativa,clt_ativa")
      .eq("tenant_id", empresa.id)
      .maybeSingle();

    const modalidades = {
      diarias: config?.diarias_ativa ?? true,
      oportunidades: config?.oportunidades_ativa ?? false,
      clt: config?.clt_ativa ?? false,
    };

    const { data: oportunidades } = await supabaseAdmin
      .from("captacao_oportunidades")
      .select(
        "id,modalidade,titulo,data_oportunidade,descricao,requisitos,informacoes_adicionais,curriculo_obrigatorio",
      )
      .eq("tenant_id", empresa.id)
      .eq("status", "ativa")
      .order("data_oportunidade", { ascending: true })
      .limit(200);

    const visiveis = (oportunidades ?? []).filter((o) =>
      o.modalidade === "clt" ? modalidades.clt : modalidades.oportunidades,
    );

    return { empresa, modalidades, oportunidades: visiveis };
  });

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
    if (data.nome.length < 3 || data.telefone.length < 10 || data.cpf.length !== 11) {
      throw new Error("Confira os dados informados antes de enviar.");
    }
    const empresa = await empresaAtiva(data.slug);
    if (!empresa) throw new Error("Este cadastro não está disponível no momento.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: config } = await supabaseAdmin
      .from("captacao_config")
      .select("oportunidades_ativa,clt_ativa")
      .eq("tenant_id", empresa.id)
      .maybeSingle();

    const { data: oportunidade } = await supabaseAdmin
      .from("captacao_oportunidades")
      .select("id,modalidade,status,curriculo_obrigatorio")
      .eq("id", data.oportunidadeId)
      .eq("tenant_id", empresa.id)
      .maybeSingle();

    if (!oportunidade || oportunidade.status !== "ativa") {
      throw new Error("Esta oportunidade não está mais recebendo cadastros.");
    }
    const modalidadeAtiva =
      oportunidade.modalidade === "clt"
        ? (config?.clt_ativa ?? false)
        : (config?.oportunidades_ativa ?? false);
    if (!modalidadeAtiva) throw new Error("Esta oportunidade não está mais disponível.");

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
          available_for_daily: false,
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
    if (jaInscrito) throw new Error("Você já está cadastrado nesta oportunidade.");

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

    return { ok: true };
  });
