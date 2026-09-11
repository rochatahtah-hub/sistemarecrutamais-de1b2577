import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { FiltrosProvider } from "@/lib/filtros";
import { AuthProvider, useAuth } from "@/lib/auth";
import { PrivacidadeProvider } from "@/lib/privacidade";
import { SystemErrorBoundary } from "@/components/SystemErrorBoundary";
import { VoltarAoTopo } from "@/components/VoltarAoTopo";
import { AssinaturaMetis } from "@/components/AssinaturaMetis";
import { registrarErroSistema } from "@/lib/system-health";
import { acaoDeEntrada, moduloDaRota, usePermissoes } from "@/lib/permissoes";

/** Rotas públicas: acessíveis sem login (portal de candidatura e tela de acesso). */
const ROTAS_PUBLICAS = ["/auth", "/reset-password", "/cadastro-diarias"];

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Não foi possível carregar esta página
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ocorreu um erro inesperado. Tente novamente ou volte ao início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "RECRUTA+ — Gestão inteligente de recrutamento" },
      {
        name: "description",
        content:
          "RECRUTA+: plataforma de gestão inteligente de recrutamento com dashboard, performance da equipe e radar da operação.",
      },
      { property: "og:title", content: "RECRUTA+ — Gestão inteligente de recrutamento" },
      {
        property: "og:description",
        content: "Indicadores, rankings, análise inteligente e radar da operação de recrutamento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      // Padrão do sistema: áreas internas nunca devem ser indexadas.
      // As rotas públicas (/auth e /cadastro-diarias) sobrescrevem esta meta.
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" translate="no">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    const erroGlobal = (evento: ErrorEvent) => {
      void registrarErroSistema(evento.error ?? evento.message, {
        componente: "Janela principal",
        operacao: "erro não tratado",
      });
    };
    const rejeicao = (evento: PromiseRejectionEvent) => {
      void registrarErroSistema(evento.reason, {
        componente: "Janela principal",
        operacao: "promessa não tratada",
      });
    };
    window.addEventListener("error", erroGlobal);
    window.addEventListener("unhandledrejection", rejeicao);
    return () => {
      window.removeEventListener("error", erroGlobal);
      window.removeEventListener("unhandledrejection", rejeicao);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PrivacidadeProvider>
          <FiltrosProvider>
            <Protegido />
          </FiltrosProvider>
        </PrivacidadeProvider>
      </AuthProvider>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

/** Gate de autenticação: rotas do sistema exigem login individual. */
function Protegido() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { carregando, session } = useAuth();
  const { pode, carregando: carregandoPermissoes } = usePermissoes();
  const rotaPublica = ROTAS_PUBLICAS.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`),
  );
  const naTelaDeLogin = pathname === "/auth";
  // Bloqueio por permissão: o módulo da rota precisa estar liberado para o perfil.
  const modulo = moduloDaRota(pathname);
  const bloqueado =
    !!session &&
    !rotaPublica &&
    !carregandoPermissoes &&
    !!modulo &&
    modulo !== "dashboard" &&
    !pode(modulo, acaoDeEntrada(modulo));

  useEffect(() => {
    if (!carregando && !session && !rotaPublica) {
      void navigate({ to: "/auth", replace: true });
    }
  }, [carregando, session, rotaPublica, navigate]);

  useEffect(() => {
    if (bloqueado) void navigate({ to: "/", replace: true });
  }, [bloqueado, navigate]);

  if (rotaPublica && (naTelaDeLogin || !session))
    return (
      <>
        <Outlet />
        <AssinaturaMetis />
      </>
    );

  if (carregando || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <SystemErrorBoundary componente="Menu lateral">
          <AppSidebar />
        </SystemErrorBoundary>
        <div className="flex min-w-0 flex-1 flex-col">
          <SystemErrorBoundary componente="Cabeçalho">
            <TopBar />
          </SystemErrorBoundary>
          <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
            {/* Required: nested routes render here. */}
            <div className="mx-auto w-full max-w-[1500px]">
              <SystemErrorBoundary key={pathname} componente="Conteúdo da página">
                {bloqueado ? (
                  <p className="py-16 text-center text-sm text-muted-foreground">
                    Redirecionando para o Dashboard...
                  </p>
                ) : (
                  <Outlet />
                )}
              </SystemErrorBoundary>
            </div>
          </main>
          <AssinaturaMetis />
          <VoltarAoTopo />
        </div>
      </div>
    </SidebarProvider>
  );
}
