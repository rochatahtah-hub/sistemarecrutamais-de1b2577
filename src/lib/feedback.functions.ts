import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { escaparHtml } from "@/lib/html-seguro";
import { linkFeedback } from "@/lib/portal-url";

/**
 * Carrega os dados públicos de um feedback pelo token do link.
 * A empresa, o tipo e o período são resolvidos SEMPRE no servidor pelo token:
 * nada vindo do navegador é usado para escolher o registro.
 */
export const feedbackPorToken = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => ({
    token: String(d?.token ?? "")
      .trim()
      .slice(0, 100),
  }))
  .handler(async ({ data }) => {
    if (!/^[a-f0-9]{16,96}$/i.test(data.token)) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: feedback, error } = await supabaseAdmin
      .from("feedbacks")
      .select("id,tipo,escopo,empresa_nome,colaborador_nome,periodo_inicio,periodo_fim,status")
      .eq("token", data.token)
      .maybeSingle();
    if (error) {
      console.error("[feedback] falha ao resolver token", error.message);
      throw new Error("Não foi possível carregar o formulário. Tente novamente.");
    }
    if (!feedback) return null;
    // Apenas os campos necessários para montar o formulário do cliente.
    return {
      tipo: feedback.tipo,
      escopo: feedback.escopo,
      empresa_nome: feedback.empresa_nome,
      colaborador_nome: feedback.colaborador_nome,
      periodo_inicio: feedback.periodo_inicio,
      periodo_fim: feedback.periodo_fim,
      status: feedback.status,
    };
  });

/** Registra a resposta do cliente. Sem login: o token é a única credencial. */
export const responderFeedback = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      token: string;
      respostas: Record<string, string>;
      nota?: number | null;
      mencoes?: string;
      observacao?: string;
    }) => {
      const respostas: Record<string, string> = {};
      for (const [chave, valor] of Object.entries(d?.respostas ?? {})) {
        if (typeof chave !== "string" || typeof valor !== "string") continue;
        respostas[chave.slice(0, 40)] = valor.slice(0, 120);
      }
      const nota = Number(d?.nota ?? 0);
      return {
        token: String(d?.token ?? "")
          .trim()
          .slice(0, 100),
        respostas,
        nota: Number.isInteger(nota) && nota >= 1 && nota <= 5 ? nota : null,
        mencoes: String(d?.mencoes ?? "").slice(0, 500),
        observacao: String(d?.observacao ?? "").slice(0, 2000),
      };
    },
  )
  .handler(async ({ data }) => {
    if (!/^[a-f0-9]{16,96}$/i.test(data.token)) throw new Error("Link inválido.");
    if (Object.keys(data.respostas).length === 0) throw new Error("Responda as perguntas.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: feedback } = await supabaseAdmin
      .from("feedbacks")
      .select("id,status,tenant_id,empresa_nome")
      .eq("token", data.token)
      .maybeSingle();
    if (!feedback) throw new Error("Link inválido.");
    if (feedback.status === "CANCELADO") throw new Error("Este feedback foi cancelado.");
    if (feedback.status === "RESPONDIDO") throw new Error("Este feedback já foi respondido.");

    const { error } = await supabaseAdmin.from("feedback_respostas").insert({
      feedback_id: feedback.id,
      tenant_id: feedback.tenant_id,
      respostas: data.respostas,
      nota: data.nota,
      mencoes: data.mencoes,
      observacao: data.observacao,
    });
    if (error) {
      if (error.code === "23505") throw new Error("Este feedback já foi respondido.");
      console.error("[feedback] falha ao gravar resposta", error.message);
      throw new Error("Não foi possível registrar sua resposta. Tente novamente.");
    }

    await supabaseAdmin
      .from("feedbacks")
      .update({ status: "RESPONDIDO", respondido_em: new Date().toISOString() })
      .eq("id", feedback.id);

    await supabaseAdmin.from("notificacoes").insert({
      tipo: "feedback",
      titulo: "Novo feedback respondido",
      mensagem: `${feedback.empresa_nome || "Cliente"} respondeu um feedback.`,
      para_admin: true,
      chave: `feedback-${feedback.id}`,
      tenant_id: feedback.tenant_id,
    });

    return { ok: true };
  });

/** Envia o link do feedback para o e-mail configurado da própria empresa. */
export const enviarFeedbackPorEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  // A origem do link NÃO vem mais do navegador: era possível mandar o cliente
  // da empresa para um domínio qualquer num e-mail assinado como Recruta+.
  // O endereço público agora sai de portal-url, fixo no servidor.
  .inputValidator((d: { id: string }) => ({
    id: String(d?.id ?? "").slice(0, 40),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: autorizado } = await supabase.rpc("tem_permissao", {
      _user_id: userId,
      _modulo: "feedback",
      _acao: "criar",
    });
    if (!autorizado) throw new Error("Sem permissão para enviar feedbacks.");

    // A leitura passa pela RLS do usuário: só alcança feedbacks da própria empresa.
    const { data: feedback } = await supabase
      .from("feedbacks")
      .select("id,token,escopo,empresa_id,rs_empresa_id,empresa_nome,tenant_id,status")
      .eq("id", data.id)
      .maybeSingle();
    if (!feedback) throw new Error("Feedback não encontrado.");
    if (feedback.status !== "PENDENTE") throw new Error("Este feedback não está pendente.");

    const consultaConfig = supabase.from("feedback_config").select("email_responsavel");
    const { data: config } = await (
      feedback.escopo === "diaria"
        ? consultaConfig.eq("empresa_id", feedback.empresa_id ?? "")
        : consultaConfig.eq("rs_empresa_id", feedback.rs_empresa_id ?? "")
    ).maybeSingle();

    const destino = (config?.email_responsavel ?? "").trim();
    if (!destino) throw new Error("Cadastre o e-mail do responsável na configuração da empresa.");

    const link = linkFeedback(feedback.token);
    // O nome da empresa é digitado por usuário do sistema. Sem escapar, ele
    // vira marcação dentro de um e-mail que sai para o contato do cliente —
    // é o caminho para phishing com a nossa assinatura.
    const empresaSegura = escaparHtml(feedback.empresa_nome ?? "");
    const assuntoSeguro = String(feedback.empresa_nome ?? "")
      .replace(/[\r\n]+/g, " ")
      .slice(0, 120);
    const chave = process.env["RESEND_API_KEY"];
    let envio_status = "pendente_dominio";
    let erro = "";

    if (chave) {
      try {
        const resposta = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Recruta+ <onboarding@resend.dev>",
            to: [destino],
            subject: `Feedback — ${assuntoSeguro}`,
            html: `<p>Olá, equipe <strong>${empresaSegura}</strong>.</p><p>Leva menos de 1 minuto para avaliar o atendimento. É só clicar no botão abaixo.</p><p><a href="${link}" rel="noopener noreferrer" style="background:#0f172a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Responder feedback</a></p><p>Ou copie o link: ${link}</p>`,
          }),
        });
        if (!resposta.ok) throw new Error(await resposta.text());
        envio_status = "enviado";
      } catch (e) {
        envio_status = "falhou";
        erro = (e as Error).message.slice(0, 300);
        console.error("[feedback] falha no envio de e-mail", erro);
      }
    }

    await supabase
      .from("feedbacks")
      .update({
        enviado_em: new Date().toISOString(),
        enviado_para: destino,
        envio_status,
      })
      .eq("id", feedback.id);

    return { envio_status, destino, link, erro };
  });
