import { queryOptions } from "@tanstack/react-query";
import { oportunidadePublica, portalCaptacaoPublico } from "./captacao.functions";

export const vagasPublicasQuery = (slug: string) => queryOptions({
  queryKey: ["vagas-publicas", slug],
  queryFn: () => portalCaptacaoPublico({ data: { slug } }),
  staleTime: 0, refetchInterval: 30_000, refetchOnWindowFocus: true,
});
export const vagaPublicaQuery = (slug: string, id: string) => queryOptions({
  queryKey: ["vaga-publica", slug, id],
  queryFn: () => oportunidadePublica({ data: { slug, id } }),
  staleTime: 0, refetchInterval: 30_000, refetchOnWindowFocus: true,
});