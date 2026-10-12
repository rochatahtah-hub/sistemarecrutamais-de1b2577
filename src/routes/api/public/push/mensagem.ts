import { createFileRoute } from "@tanstack/react-router";
import { REGRAS_ALERTA, type TipoAlerta } from "@/lib/alertas-push";
import { endpointPushValido } from "@/lib/push-endpoint";
import { mensagemSemanal } from "@/lib/push-semanal";

/**
 * O service worker busca aqui o texto do alerta assim que o push chega.
 * Quem conhece o endpoint é o próprio dispositivo (endereço secreto); a
 * mensagem é entregue uma vez e apagada. Só alertas das últimas 2 horas.
 */
export const Route = createFileRoute("/api/public/push/mensagem")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let endpoint = "";
        let recebido: string | undefined;
        try {
          const corpo = await request.json() as { endpoint?: string; recebido?: string };
          endpoint = String(corpo.endpoint ?? "").slice(0, 1000);
          recebido = typeof corpo.recebido === "string" ? corpo.recebido : undefined;
        } catch {
          /* corpo inválido */
        }
        const headers = { "Cache-Control": "no-store" };
        if (!endpointPushValido(endpoint)) return Response.json({ mensagens: [] }, { headers });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        if (recebido) {
          const { data: confirmados, error } = await supabaseAdmin.from("push_usuarios")
            .update({ mensagens: [], mensagens_em: null }).eq("endpoint", endpoint)
            .eq("status", "ativa").eq("mensagens_em", recebido).select("id");
          console.info("[push-mensagem] confirmação de exibição", { confirmados: confirmados?.length ?? 0, falha: Boolean(error) });
          return Response.json({ ok: !error }, { headers, status: error ? 503 : 200 });
        }
        const { data, error: erroInscricao } = await supabaseAdmin
          .from("push_usuarios")
          .select("user_id,mensagens,mensagens_em")
          .eq("endpoint", endpoint)
          .eq("status", "ativa")
          .maybeSingle();
        if (erroInscricao) return Response.json({ mensagens: [], interno: true }, { headers, status: 503 });
        const idade = data?.mensagens_em ? Date.now() - new Date(data.mensagens_em).getTime() : Infinity;
        // Weekly messages remain deliverable throughout their local day. The
        // operational evaluator still rechecks live data; no stale fallback.
        const recente = data?.mensagens_em && idade >= 0 && idade < 7 * 86400000;
        let mensagens: { tipo: string; titulo: string; corpo: string; url: string }[] = [];
        if (recente && data && Array.isArray(data.mensagens)) {
          // Keep the batch until the device confirms display; retrieval alone is not delivery.
          const tipos = data.mensagens.flatMap((m) => {
            if (!m || typeof m !== "object" || Array.isArray(m)) return [];
            const tipo = m['tipo'];
            return idade < 2 * 3600 * 1000 && typeof tipo === "string" && Object.hasOwn(REGRAS_ALERTA, tipo) ? [tipo as TipoAlerta] : [];
          });
          const { alertasAtuaisDoUsuario } = await import("@/lib/alertas-push.server");
          try {
            try {
              mensagens = await alertasAtuaisDoUsuario(supabaseAdmin, data.user_id, tipos);
            } catch (erro) {
              console.error("[push-mensagem] falha operacional independente", erro);
            }
            const { data: perfil, error: erroPerfil } = await supabaseAdmin.from("profiles")
              .select("ativo,tenant_id,fuso_horario,tenants(ativo,status,fuso_horario)").eq("id", data.user_id).maybeSingle();
            if (erroPerfil) throw erroPerfil;
            if (perfil?.ativo && perfil.tenants?.ativo && perfil.tenants.status === "ativo") {
              if (idade < 2 * 3600 * 1000 && data.mensagens.some(m => m && typeof m === "object" && !Array.isArray(m) && m["tipo"] === "teste_dispositivo")) {
                const { data: master, error: erroMaster } = await supabaseAdmin.rpc("eh_super_admin", { _user_id: data.user_id });
                if (erroMaster) throw erroMaster;
                if (master === true) mensagens.push({ tipo: "teste_dispositivo", titulo: "Recruta+", corpo: "Notificações funcionando neste dispositivo.", url: "/" });
              }
              const semanal = mensagemSemanal(new Date(), perfil.fuso_horario ?? perfil.tenants.fuso_horario);
              if (semanal && data.mensagens.some(m => m && typeof m === "object" && !Array.isArray(m) && m["tipo"] === semanal.tipo && m["dia"] === semanal.dia)) mensagens.push(semanal);
            }
            const { avisoLevantamentoAtual } = await import("@/lib/levantamento-aviso.server");
            for (const item of data.mensagens) {
              if (!item || typeof item !== "object" || Array.isArray(item) || typeof item["notificacaoId"] !== "string") continue;
              const aviso = await avisoLevantamentoAtual(data.user_id, item["notificacaoId"]);
              if (aviso && !mensagens.some(m => m.tipo === aviso.tipo)) mensagens.push(aviso);
            }
          } catch (erro) {
            console.error("[push-mensagem] falha na revalidação", erro);
            // A failed live check is not evidence of a pending action.
            return Response.json({ mensagens: [], interno: true }, { headers, status: 503 });
          }
        }
        if (data?.mensagens_em && !recente) {
          // Do not erase a newer batch queued during this read.
          await supabaseAdmin.from("push_usuarios").update({ mensagens: [], mensagens_em: null })
            .eq("endpoint", endpoint).eq("mensagens_em", data.mensagens_em);
        }
        const { data: portal, error: erroPortal } = await supabaseAdmin.from("push_inscricoes")
          .select("id").eq("endpoint", endpoint).eq("status", "ativa").maybeSingle();
        return Response.json({ mensagens, lote: recente ? data?.mensagens_em : null, interno: Boolean(data) || !portal || Boolean(erroPortal) }, { headers });
      },
    },
  },
});
