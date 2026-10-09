import { useCallback, useEffect, useState } from "react";
import { BellRing, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { chavePublicaPush } from "@/lib/push.functions";
import { ativarAlertasUsuario, desativarAlertasUsuario, estadoAlertasUsuario } from "@/lib/push-usuario.functions";
import { useAuth } from "@/lib/auth";

type Estado = "oculto" | "bloqueado" | "inativo" | "ativo";

function bytes(valor: string): ArrayBuffer {
  const b64 = valor.replace(/-/g, "+").replace(/_/g, "/");
  const s = atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "="));
  const buf = new ArrayBuffer(s.length);
  const v = new Uint8Array(buf);
  for (let i = 0; i < s.length; i++) v[i] = s.charCodeAt(i);
  return buf;
}

/** Liga/desliga os alertas automáticos no dispositivo. Pede permissão só no clique. */
export function BotaoNotificacoesPush() {
  const { user } = useAuth();
  const consultar = useServerFn(estadoAlertasUsuario);
  const ativar = useServerFn(ativarAlertasUsuario);
  const desativar = useServerFn(desativarAlertasUsuario);
  const chavePublica = useServerFn(chavePublicaPush);
  const [estado, setEstado] = useState<Estado>("oculto");
  const [ocupado, setOcupado] = useState(false);

  const sincronizar = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
      return setEstado("oculto");
    if (Notification.permission === "denied") return setEstado("bloqueado");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      const inscricao = sub && user ? await consultar({ data: { endpoint: sub.endpoint } }) : null;
      setEstado(inscricao?.ativo ? "ativo" : "inativo");
    } catch {
      setEstado("oculto");
    }
  }, [consultar, user?.id]);

  useEffect(() => {
    void sincronizar();
  }, [sincronizar]);

  async function alternar() {
    if (estado === "bloqueado") {
      toast.info("Notificações bloqueadas. Libere-as nas configurações do navegador.");
      return;
    }
    setOcupado(true);
    try {
      if (estado === "ativo") {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await desativar({ data: { endpoint: sub.endpoint } });
        }
        setEstado("inativo");
        toast.success("Notificações desativadas neste dispositivo.");
        return;
      }
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado(permissao === "denied" ? "bloqueado" : "inativo");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const { chave } = await chavePublica();
      if (!chave) throw new Error("Notificações ainda não disponíveis.");
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(chave) }));
      await ativar({ data: { endpoint: sub.endpoint } });
      setEstado("ativo");
      toast.success("Notificações ativadas. Você receberá alertas mesmo com o Recruta+ fechado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível alterar as notificações.");
      void sincronizar();
    } finally {
      setOcupado(false);
    }
  }

  if (estado === "oculto") return null;
  const ativo = estado === "ativo";
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={ocupado}
      onClick={() => void alternar()}
      title={ativo ? "Desativar notificações no dispositivo" : "Ativar notificações no dispositivo"}
      aria-label={ativo ? "Desativar notificações" : "Ativar notificações"}
      className={ativo ? "text-gold" : "text-muted-foreground"}
    >
      {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : ativo ? <BellRing className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
    </Button>
  );
}
