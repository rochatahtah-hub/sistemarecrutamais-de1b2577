export const ORIGEM_PORTAL_PUBLICO = "https://recrutamaisrh.ia.br";

export function caminhoPortalDiarias(slug: string) {
  return `/cadastro-diarias/${encodeURIComponent(slug)}`;
}

export function linkPortalDiarias(slug: string) {
  return `${ORIGEM_PORTAL_PUBLICO}${caminhoPortalDiarias(slug)}`;
}