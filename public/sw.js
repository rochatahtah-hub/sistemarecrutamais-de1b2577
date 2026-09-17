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

const VERSAO = "recruta-mais-v1";
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
