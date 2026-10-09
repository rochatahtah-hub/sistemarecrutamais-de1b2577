/*
 * Service Worker do Recruta+ — deliberadamente conservador.
 *
 * O objetivo aqui é só tornar o app instalável e deixar o carregamento dos
 * arquivos estáticos mais rápido. Ele NUNCA entra no caminho de dados:
 *
 *  - só intercepta GET do mesmo domínio;
 *  - só guarda arquivo estático de build (js, css, fonte, imagem);
 *  - nunca guarda navegação/HTML (evita servir tela velha depois de um deploy);
 *  - nunca guarda chamada de servidor (/api, /_serverFn) nem nada do Supabase,
 *    que é outro domínio — token, sessão e dado de empresa não passam por aqui;
 *  - a cada versão nova, os caches antigos são apagados no activate.
 *
 * Se qualquer coisa falhar, o fetch cai direto na rede: o app funciona igual
 * a antes de existir service worker.
 */

const VERSAO = "recruta-mais-v6";
const ESTATICOS = /\.(?:js|mjs|css|woff2?|ttf|otf|png|jpe?g|svg|gif|webp|avif|ico)$/i;
const NUNCA_CACHEAR = /^\/(?:api|_serverFn)\//;

self.addEventListener("install", (evento) => {
  // A versão nova assume assim que estiver pronta — nada de usuário preso
  // numa versão antiga do app esperando fechar todas as abas.
  evento.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

/*
 * Aviso de nova vaga.
 *
 * O push chega SEM conteúdo — de propósito. O texto abaixo é fixo e mora aqui,
 * então nada sobre a vaga, a empresa ou a pessoa passa pelo serviço de push nem
 * aparece na tela bloqueada do celular. Os detalhes só existem dentro do portal.
 */
const AVISO_TITULO = "Nova vaga disponível no Recruta+";
const AVISO_CORPO = "Acesse o portal para consultar os detalhes.";

/*
 * Alertas automáticos de usuários internos: o push continua vazio; o texto é
 * buscado no servidor pelo próprio endpoint (entregue uma vez). Se não houver
 * alerta pendente, é um aviso de nova vaga do portal.
 */
async function buscarAlertas() {
  try {
    const sub = await self.registration.pushManager.getSubscription();
    if (!sub) return { mensagens: [], interno: true };
    const r = await fetch("/api/public/push/mensagem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
      cache: "no-store",
    });
    if (!r.ok) return { mensagens: [], interno: true };
    const j = await r.json();
    return { mensagens: Array.isArray(j.mensagens) ? j.mensagens : [], interno: j.interno === true };
  } catch {
    return { mensagens: [], interno: true };
  }
}

self.addEventListener("push", (evento) => {
  evento.waitUntil(
    (async () => {
      const { mensagens: alertas, interno } = await buscarAlertas();
      if (interno && alertas.length === 0) {
        const existentes = await self.registration.getNotifications();
        for (const aviso of existentes) {
          if (aviso.tag.startsWith("recruta-alerta-") || aviso.tag === "recruta-atualizacoes") aviso.close();
        }
        return;
      }
      if (alertas.length > 0) {
        await Promise.all(
          alertas.map((a) =>
            self.registration.showNotification(String(a.titulo || "Recruta+"), {
              body: String(a.corpo || ""),
              icon: "/icon-192.png",
              badge: "/icon-192.png",
              tag: "recruta-alerta-" + String(a.tipo || "geral"),
               data: { url: typeof a.url === "string" && a.url.startsWith("/") && !a.url.startsWith("//") ? a.url : "/" },
            }),
          ),
        );
        return;
      }
      await self.registration.showNotification(AVISO_TITULO, {
        body: AVISO_CORPO,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "recruta-mais-nova-vaga",
        renotify: true,
      });
    })(),
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const destino = (evento.notification.data && evento.notification.data.url) || null;
  evento.waitUntil(
    (async () => {
      const abertas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (destino) {
        for (const c of abertas) {
          if ("navigate" in c && "focus" in c) {
            await c.focus();
            return c.navigate(destino);
          }
        }
        return self.clients.openWindow ? self.clients.openWindow(destino) : undefined;
      }
      for (const cliente of abertas) {
        if (cliente.url.includes("/cadastro-diarias") && "focus" in cliente) {
          return cliente.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
      return undefined;
    })(),
  );
});

self.addEventListener("fetch", (evento) => {
  const requisicao = evento.request;

  if (requisicao.method !== "GET") return;
  if (requisicao.mode === "navigate") return;

  let url;
  try {
    url = new URL(requisicao.url);
  } catch {
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (NUNCA_CACHEAR.test(url.pathname)) return;
  if (!ESTATICOS.test(url.pathname)) return;

  // stale-while-revalidate: responde rápido do cache e atualiza por trás.
  evento.respondWith(
    (async () => {
      const cache = await caches.open(VERSAO);
      const guardado = await cache.match(requisicao);
      const rede = fetch(requisicao)
        .then((resposta) => {
          if (resposta && resposta.ok && resposta.type === "basic") {
            cache.put(requisicao, resposta.clone()).catch(() => {});
          }
          return resposta;
        })
        .catch(() => null);
      const resposta = guardado || (await rede);
      return resposta || fetch(requisicao);
    })(),
  );
});
