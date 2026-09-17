import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cancelarAvisoVagas, chavePublicaPush, inscreverAvisoVagas } from "@/lib/push.functions";

type Estado = "carregando" | "desligado" | "sem_suporte" | "bloqueado" | "inativo" | "ativo";

function base64UrlParaBytes(valor: string): ArrayBuffer {
  const base64 = valor.replace(/-/g, "+").replace(/_/g, "/");
  const preenchido = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binario = atob(preenchido);
  const buffer = new ArrayBuffer(binario.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return buffer;
}

function temSuporte(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Permite ao colaborador pedir para ser avisado quando a empresa publicar uma
 * vaga nova.
 *
 * A permissão nativa do navegador só é solicitada depois de um toque explícito
 * no botão — nunca ao abrir a página. Se a pessoa já bloqueou nas configurações
 * do aparelho, o componente diz isso em vez de insistir: não há como contornar,
 * e tentar seria só irritar.
 */
export function AvisoNovasVagas({ slug }: { slug: string }) {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [ocupado, setOcupado] = useState(false);

  const sincronizar = useCallback(async () => {
    // Enquanto as chaves do push não estiverem configuradas no servidor, o
    // recurso não existe para o colaborador — melhor não aparecer do que
    // aparecer e não funcionar.
    try {
      const { chave } = await chavePublicaPush();
      if (!chave) {
        setEstado("desligado");
        return;
      }
    } catch {
      setEstado("desligado");
      return;
    }
    if (!temSuporte()) {
      setEstado("sem_suporte");
      return;
    }
    if (Notification.permission === "denied") {
      setEstado("bloqueado");
      return;
    }
    try {
      const registro = await navigator.serviceWorker.ready;
      const inscricao = await registro.pushManager.getSubscription();
      setEstado(inscricao ? "ativo" : "inativo");
    } catch {
      setEstado("sem_suporte");
    }
  }, []);

  useEffect(() => {
    void sincronizar();
  }, [sincronizar]);

  async function ativar() {
    setOcupado(true);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado(permissao === "denied" ? "bloqueado" : "inativo");
        return;
      }
      const { chave } = await chavePublicaPush();
      if (!chave) {
        toast.error("Os avisos ainda não estão disponíveis. Tente novamente mais tarde.");
        return;
      }
      const registro = await navigator.serviceWorker.ready;
      const inscricao = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlParaBytes(chave),
      });
      await inscreverAvisoVagas({ data: { slug, endpoint: inscricao.endpoint } });
      setEstado("ativo");
      toast.success(
        "Notificações ativadas. Você será avisado quando novas vagas forem publicadas.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível ativar os avisos.");
      void sincronizar();
    } finally {
      setOcupado(false);
    }
  }

  async function desativar() {
    setOcupado(true);
    try {
      const registro = await navigator.serviceWorker.ready;
      const inscricao = await registro.pushManager.getSubscription();
      if (inscricao) {
        await cancelarAvisoVagas({ data: { endpoint: inscricao.endpoint } });
        await inscricao.unsubscribe();
      }
      setEstado("inativo");
      toast.success("Avisos desativados. Você não receberá mais notificações de novas vagas.");
    } catch {
      toast.error("Não foi possível desativar os avisos agora.");
    } finally {
      setOcupado(false);
    }
  }

  if (estado === "carregando" || estado === "desligado") return null;

  return (
    <div className="mb-6 rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold/10 text-gold">
          {estado === "ativo" ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          {estado === "ativo" ? (
            <>
              <p className="font-display text-sm font-semibold text-sidebar-foreground">
                Avisos ativados
              </p>
              <p className="mt-1 text-xs leading-5 text-sidebar-foreground/70">
                Você receberá um aviso quando novas vagas forem publicadas. Os detalhes aparecem
                aqui no portal.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                disabled={ocupado}
                onClick={desativar}
              >
                {ocupado && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Não quero mais receber
              </Button>
            </>
          ) : estado === "bloqueado" ? (
            <>
              <p className="font-display text-sm font-semibold text-sidebar-foreground">
                Notificações bloqueadas no aparelho
              </p>
              <p className="mt-1 text-xs leading-5 text-sidebar-foreground/70">
                Para receber avisos de novas vagas, libere as notificações deste site nas
                configurações do seu navegador.
              </p>
            </>
          ) : estado === "sem_suporte" ? (
            <>
              <p className="font-display text-sm font-semibold text-sidebar-foreground">
                Notificações não disponíveis neste navegador
              </p>
              <p className="mt-1 text-xs leading-5 text-sidebar-foreground/70">
                No iPhone, instale o Recruta+ na tela de início pelo Safari para poder receber os
                avisos.
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-sm font-semibold text-sidebar-foreground">
                Deseja receber avisos de novas vagas?
              </p>
              <p className="mt-1 text-xs leading-5 text-sidebar-foreground/70">
                Ative as notificações para ser informado quando novas oportunidades forem
                publicadas. Você pode desativar quando quiser.
              </p>
              <Button size="sm" className="mt-3" disabled={ocupado} onClick={ativar}>
                {ocupado ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Bell className="mr-2 h-3.5 w-3.5" />
                )}
                Ativar notificações
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
