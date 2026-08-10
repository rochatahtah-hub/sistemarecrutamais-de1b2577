import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { routeTree } from "./routeTree.gen";
import { mensagemErro } from "./lib/sincronizar";
import { registrarErroSistema } from "./lib/system-health";

function statusDoErro(error: unknown): number | undefined {
  const bruto = error instanceof Error ? error.message : String(error ?? "");
  const m = /\b(401|403|404|429|5\d\d)\b/.exec(bruto);
  return m ? Number(m[1]) : undefined;
}

/** Item 17: nenhum erro de dados pode derrubar a aplicação. */
function tratarErro(error: unknown, operacao: string) {
  if (typeof window === "undefined") return;
  const mensagem = mensagemErro(error);
  // id fixo por mensagem: evita empilhar dezenas de avisos iguais
  toast.error(mensagem, { id: `erro-${mensagem}` });
  void registrarErroSistema(error, { componente: "Dados", operacao });
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => tratarErro(error, "carregamento de dados"),
    }),
    mutationCache: new MutationCache({
      onError: (error) => tratarErro(error, "gravação de dados"),
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (tentativa, error) => {
          const status = statusDoErro(error);
          if (status && status < 500 && status !== 429) return false;
          return tentativa < 2;
        },
      },
      mutations: { retry: false },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
