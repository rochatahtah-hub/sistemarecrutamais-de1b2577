import type { QueryClient } from "@tanstack/react-query";

/**
 * REGRA DE OURO (item 24): a informação existe uma única vez na fonte correta
 * e todo o restante do sistema é recarregado a partir dela.
 *
 * Ao gravar qualquer dado (confirmação, vaga, candidato, empresa, colaborador,
 * bloqueio, meta, quinzena), chame esta função: ela revalida Dashboard,
 * gráficos, performance, relatórios, análise inteligente, radar, histórico e
 * notificações de uma só vez, evitando telas com números divergentes.
 */
export function sincronizarSistema(qc: QueryClient) {
  void qc.invalidateQueries();
}

/** Mensagem amigável padrão para falhas de carregamento. */
export function mensagemErro(error: unknown): string {
  const bruto =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (/401|jwt|unauthorized|sessão|session/i.test(bruto)) {
    return "Sua sessão expirou. Entre novamente para continuar.";
  }
  if (/fetch|network|failed to fetch|timeout/i.test(bruto)) {
    return "Não foi possível conectar. Verifique sua internet e tente novamente.";
  }
  return "Não foi possível carregar os dados. Tente novamente.";
}
