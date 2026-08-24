export const ORIGEM_PORTAL_PUBLICO = "https://recrutamaisrh.ia.br";

export function caminhoPortalDiarias(slug: string) {
  return `/cadastro-diarias/${encodeURIComponent(slug)}`;
}

export function linkPortalDiarias(slug: string) {
  return `${ORIGEM_PORTAL_PUBLICO}${caminhoPortalDiarias(slug)}`;
}

/** Link público (sem login) para o cliente responder um feedback. */
export function linkFeedback(token: string) {
  return `${ORIGEM_PORTAL_PUBLICO}/responder-feedback/${encodeURIComponent(token)}`;
}
