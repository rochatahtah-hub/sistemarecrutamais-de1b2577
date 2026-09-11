import { randomBytes } from "crypto";

import { AGIZZE_TENANT_ID } from "./comercial.server";

function slugificar(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 52) || "empresa";
}

export async function provisionarPedidoAprovado(pedidoId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: pedido } = await supabaseAdmin.from("pedidos_comerciais").select("id,lead_id,plano_id,tenant_id,status").eq("id", pedidoId).maybeSingle();
  if (!pedido || pedido.status !== "aprovado") throw new Error("Pedido ainda não está aprovado.");
  if (pedido.tenant_id) return { tenantId: pedido.tenant_id, criado: false };
  const { data: lead } = await supabaseAdmin.from("leads_comerciais").select("id,empresa_nome,responsavel_nome,email").eq("id", pedido.lead_id).maybeSingle();
  if (!lead) throw new Error("Lead da contratação não encontrado.");

  const base = slugificar(lead.empresa_nome);
  let slug = base;
  for (let numero = 2; numero < 100; numero += 1) {
    const { data: existente } = await supabaseAdmin.from("tenants").select("id").eq("slug", slug).maybeSingle();
    if (!existente) break;
    slug = `${base}-${numero}`;
  }
  const { data: tenant, error: erroTenant } = await supabaseAdmin.from("tenants").insert({
    nome: lead.empresa_nome,
    slug,
    plano_id: pedido.plano_id,
    origem_comercial: "leads",
    isento_comercial: false,
    assinatura_status: "ativa",
    status: "ativo",
    ativo: true,
  }).select("id").single();
  if (erroTenant || !tenant || tenant.id === AGIZZE_TENANT_ID) throw new Error("Não foi possível criar a nova empresa.");

  const [perfis, configuracoes] = await Promise.all([
    supabaseAdmin.from("perfis_acesso").select("id,chave,nome,descricao,sistema,ativo").eq("tenant_id", AGIZZE_TENANT_ID),
    supabaseAdmin.from("configuracoes").select("chave,valor").eq("tenant_id", AGIZZE_TENANT_ID),
  ]);
  if (perfis.error) throw perfis.error;
  if ((perfis.data ?? []).length > 0) {
    const { data: novosPerfis, error } = await supabaseAdmin.from("perfis_acesso").insert((perfis.data ?? []).map((p) => ({ tenant_id: tenant.id, chave: p.chave, nome: p.nome, descricao: p.descricao, sistema: p.sistema, ativo: p.ativo }))).select("id,chave");
    if (error) throw error;
    const antigos = new Map((perfis.data ?? []).map((p) => [p.id, p.chave]));
    const novos = new Map((novosPerfis ?? []).map((p) => [p.chave, p.id]));
    const { data: permissoes } = await supabaseAdmin.from("perfil_permissoes").select("perfil_id,modulo,acao,permitido").eq("tenant_id", AGIZZE_TENANT_ID);
    const copiar = (permissoes ?? []).flatMap((p) => { const chave = antigos.get(p.perfil_id); const perfilId = chave ? novos.get(chave) : null; return perfilId ? [{ tenant_id: tenant.id, perfil_id: perfilId, modulo: p.modulo, acao: p.acao, permitido: p.permitido }] : []; });
    if (copiar.length > 0) await supabaseAdmin.from("perfil_permissoes").insert(copiar);
  }
  if ((configuracoes.data ?? []).length > 0) await supabaseAdmin.from("configuracoes").insert((configuracoes.data ?? []).map((c) => ({ tenant_id: tenant.id, chave: c.chave, valor: c.valor })));

  const senhaTemporaria = randomBytes(24).toString("base64url");
  const { data: usuario, error: erroUsuario } = await supabaseAdmin.auth.admin.createUser({ email: lead.email, password: senhaTemporaria, email_confirm: true, user_metadata: { nome: lead.responsavel_nome, tenant_id: tenant.id, acesso_comercial: true } });
  if (erroUsuario || !usuario.user) throw new Error("A empresa foi criada, mas o primeiro acesso precisa de revisão pela equipe.");
  const { data: perfilAdmin } = await supabaseAdmin.from("perfis_acesso").select("id").eq("tenant_id", tenant.id).eq("chave", "admin").maybeSingle();
  await supabaseAdmin.from("profiles").upsert({ id: usuario.user.id, nome: lead.responsavel_nome, email: lead.email, ativo: true, tenant_id: tenant.id, perfil_id: perfilAdmin?.id ?? null, troca_senha_obrigatoria: true }, { onConflict: "id" });
  await supabaseAdmin.from("user_roles").upsert({ user_id: usuario.user.id, role: "admin" }, { onConflict: "user_id,role" });
  await supabaseAdmin.from("pedidos_comerciais").update({ tenant_id: tenant.id }).eq("id", pedido.id);
  await supabaseAdmin.from("leads_comerciais").update({ convertido_tenant_id: tenant.id, status: "convertido" }).eq("id", lead.id);
  await supabaseAdmin.from("assinaturas_comerciais").upsert({ tenant_id: tenant.id, pedido_id: pedido.id, plano_id: pedido.plano_id, status: "ativa", periodo_inicio: new Date().toISOString(), proxima_cobranca_em: new Date(Date.now() + 30 * 86400_000).toISOString() }, { onConflict: "pedido_id" });
  await supabaseAdmin.from("liberacoes_cadastro").update({ tenant_id: tenant.id, user_id: usuario.user.id }).eq("pedido_id", pedido.id);
  const { error: erroRecuperacao } = await supabaseAdmin.auth.resetPasswordForEmail(lead.email, { redirectTo: `${process.env["APP_PUBLIC_URL"] ?? "https://recrutamaisrh.ia.br"}/primeiro-acesso` });
  if (erroRecuperacao) console.error("[provisionamento] falha ao enviar definição de senha", erroRecuperacao.message);
  return { tenantId: tenant.id, criado: true };
}