import { useCallback, useEffect, useState } from "react";

/**
 * Instalação do Recruta+ como aplicativo (PWA).
 *
 * Usa exclusivamente o mecanismo oficial do navegador: nada de APK, download
 * simulado ou promessa de instalação que o navegador não suporta. Quando o
 * fluxo automático não existe (caso do iPhone), o app mostra as instruções
 * reais daquele aparelho em vez de fingir que instalou.
 */

/** Evento do Chrome/Edge; não existe em todos os navegadores. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const CHAVE_ADIADO = "recruta-mais:instalacao-adiada-ate";
const DIAS_DE_ESPERA = 14;

/*
 * O beforeinstallprompt costuma disparar antes do React montar. Se o listener
 * só fosse criado dentro do useEffect, o evento se perderia e o app nunca
 * ficaria instalável. Por isso a captura acontece já no carregamento do módulo
 * e o hook apenas lê o que foi guardado.
 */
let eventoGuardado: BeforeInstallPromptEvent | null = null;
let jaInstalado = false;
const inscritos = new Set<() => void>();

function avisar() {
  for (const f of inscritos) f();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    eventoGuardado = e as BeforeInstallPromptEvent;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    jaInstalado = true;
    eventoGuardado = null;
    avisar();
  });
}

export type PlataformaInstalacao = "nativa" | "ios" | "indisponivel";

function rodandoInstalado(): boolean {
  if (typeof window === "undefined") return false;
  const navegadorIos = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    navegadorIos.standalone === true
  );
}

function ehIos(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  // iPadOS recente se identifica como Mac; o toque é o que o diferencia.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function adiadoAteAgora(): boolean {
  try {
    const ate = window.localStorage.getItem(CHAVE_ADIADO);
    return Boolean(ate) && Date.now() < Number(ate);
  } catch {
    return false;
  }
}

function registrarAdiamento() {
  try {
    window.localStorage.setItem(
      CHAVE_ADIADO,
      String(Date.now() + DIAS_DE_ESPERA * 24 * 60 * 60 * 1000),
    );
  } catch {
    /* navegação privada: só não lembra a escolha */
  }
}

export function useInstalacaoPwa() {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(eventoGuardado);
  const [instalado, setInstalado] = useState(jaInstalado);
  const [convidando, setConvidando] = useState(false);
  const [instalando, setInstalando] = useState(false);

  useEffect(() => {
    if (rodandoInstalado()) {
      setInstalado(true);
      return;
    }

    const sincronizar = () => {
      setEvento(eventoGuardado);
      setInstalado(jaInstalado);
      if (jaInstalado) setConvidando(false);
      else if (eventoGuardado && !adiadoAteAgora()) setConvidando(true);
    };

    inscritos.add(sincronizar);
    sincronizar(); // o evento pode ter chegado antes deste componente montar

    // iPhone não dispara beforeinstallprompt: o convite aparece com instruções.
    if (ehIos() && !adiadoAteAgora()) setConvidando(true);

    return () => {
      inscritos.delete(sincronizar);
    };
  }, []);

  const plataforma: PlataformaInstalacao = evento ? "nativa" : ehIos() ? "ios" : "indisponivel";

  const instalar = useCallback(async () => {
    if (!evento || instalando) return;
    setInstalando(true);
    try {
      await evento.prompt();
      const { outcome } = await evento.userChoice;
      if (outcome === "dismissed") registrarAdiamento();
      // "accepted" não é garantia de instalação concluída: quem confirma isso
      // é o evento appinstalled, tratado acima.
      eventoGuardado = null; // o navegador não reaproveita o mesmo evento
      setEvento(null);
      setConvidando(false);
    } catch {
      setConvidando(false);
    } finally {
      setInstalando(false);
    }
  }, [evento, instalando]);

  const agoraNao = useCallback(() => {
    registrarAdiamento();
    setConvidando(false);
  }, []);

  const abrirConvite = useCallback(() => setConvidando(true), []);

  return {
    /** Pode oferecer instalação neste aparelho/navegador agora. */
    podeInstalar: !instalado && plataforma !== "indisponivel",
    plataforma,
    instalado,
    convidando,
    instalando,
    instalar,
    agoraNao,
    abrirConvite,
    fechar: () => setConvidando(false),
  };
}

/** Registra o service worker. Falhar aqui nunca pode derrubar o app. */
export function registrarServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") return;
  const registrar = () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* sem service worker o app funciona igual; só não fica instalável */
    });
  };
  // O React costuma montar depois do "load"; nesse caso o listener nunca
  // dispararia e o app jamais ficaria instalável.
  if (document.readyState === "complete") registrar();
  else window.addEventListener("load", registrar, { once: true });
}
