import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type Acao =
  | "visualizar"
  | "criar"
  | "editar"
  | "excluir"
  | "exportar"
  | "utilizar"
  | "administrar"
  | "conferir"
  | "validar"
  | "apontar_divergencia"
  | "resolver_divergencia"
  | "historico"
  | "processar"
  | "arquivar"
  | "restaurar"
  | "editar_aguardando_confirmacao"
  | "detalhar"
  | "configurar"
  | "reprocessar"
  | "receber_notificacao";

export interface ModuloInfo {
  chave: string;
  nome: string;
  acoes: Acao[];
}

/** Catálogo de módulos e ações administráveis do Recruta+. */
export const MODULOS: ModuloInfo[] = [
  { chave: "dashboard", nome: "Dashboard", acoes: ["visualizar"] },
  {
    chave: "vagas",
    nome: "Vagas",
    acoes: ["visualizar", "criar", "editar", "excluir", "exportar"],
  },
  {
    chave: "programacao",
    nome: "Minha Programação",
    acoes: ["visualizar", "criar", "editar", "excluir", "editar_aguardando_confirmacao"],
  },
  { chave: "programadoras", nome: "Programações da equipe", acoes: ["visualizar", "editar"] },
  { chave: "candidatos", nome: "Candidatos", acoes: ["visualizar", "criar", "editar", "excluir"] },
  { chave: "confirmacoes", nome: "Confirmações", acoes: ["visualizar", "editar"] },
  {
    chave: "atendimento",
    nome: "Atendimento",
    acoes: [
      "visualizar",
      "conferir",
      "validar",
      "apontar_divergencia",
      "resolver_divergencia",
      "historico",
    ],
  },
  {
    chave: "atendimento_valores",
    nome: "Atendimento — Valores",
    acoes: ["visualizar", "editar", "conferir"],
  },
  {
    chave: "pagamentos",
    nome: "Pagamentos",
    acoes: ["visualizar", "editar", "exportar", "conferir", "processar"],
  },
  { chave: "equipe", nome: "Equipe", acoes: ["visualizar", "criar", "editar", "excluir"] },
  { chave: "empresas", nome: "Empresas", acoes: ["visualizar", "criar", "editar", "excluir"] },
  { chave: "metas", nome: "Metas", acoes: ["visualizar", "criar", "editar", "excluir"] },
  { chave: "bloqueios", nome: "Bloqueios", acoes: ["visualizar", "criar", "editar", "excluir"] },
  {
    chave: "banco_colaboradores",
    nome: "Banco de Colaboradores",
    acoes: ["visualizar", "criar", "editar", "excluir", "exportar"],
  },
  { chave: "performance", nome: "Performance", acoes: ["visualizar", "exportar"] },
  { chave: "analise", nome: "Análise Inteligente", acoes: ["visualizar"] },
  { chave: "radar", nome: "Radar da Operação", acoes: ["visualizar"] },
  { chave: "comparar", nome: "Comparar Períodos", acoes: ["visualizar"] },
  { chave: "relatorios", nome: "Relatórios", acoes: ["visualizar", "exportar"] },
  {
    chave: "feedback",
    nome: "Feedback dos Clientes",
    acoes: ["visualizar", "criar", "editar", "administrar"],
  },
  { chave: "feedback_respostas", nome: "Feedback — Respostas", acoes: ["visualizar"] },
  { chave: "feedback_dashboard", nome: "Feedback — Dashboard", acoes: ["visualizar"] },

  {
    chave: "captacao",
    nome: "Captação de Candidatos",
    acoes: ["visualizar", "criar", "editar", "arquivar", "restaurar", "excluir", "administrar"],
  },
  { chave: "chat", nome: "Chat", acoes: ["utilizar"] },
  { chave: "importar", nome: "Importar Excel", acoes: ["visualizar", "criar"] },
  {
    chave: "historico",
    nome: "Histórico",
    acoes: ["visualizar", "editar", "excluir", "exportar"],
  },
  { chave: "auditoria", nome: "Histórico de Alterações", acoes: ["visualizar", "exportar"] },
  { chave: "acessos", nome: "Histórico de Acessos", acoes: ["visualizar"] },
  { chave: "backups", nome: "Backups", acoes: ["visualizar", "criar", "excluir"] },
  {
    chave: "banco_dados",
    nome: "Banco de Dados",
    acoes: ["visualizar", "criar", "editar", "excluir", "exportar", "administrar"],
  },
  { chave: "configuracoes", nome: "Configurações", acoes: ["visualizar", "editar"] },
  {
    chave: "administracao",
    nome: "Central de Administração",
    acoes: ["visualizar", "administrar"],
  },
  { chave: "saude", nome: "Saúde do Sistema", acoes: ["visualizar", "exportar"] },
  { chave: "perfis", nome: "Perfis e Permissões", acoes: ["visualizar", "administrar"] },
  {
    chave: "comercial_saas",
    nome: "Gestão comercial SaaS",
    acoes: ["visualizar", "administrar", "configurar", "exportar"],
  },
  {
    chave: "rs_candidatos",
    nome: "R&S — Meus Candidatos",
    acoes: ["visualizar", "criar", "editar", "excluir", "exportar"],
  },
  {
    chave: "rs_empresas",
    nome: "R&S — Empresas CLT",
    acoes: ["visualizar", "criar", "editar", "excluir"],
  },
  { chave: "rs_dashboard", nome: "R&S — Dashboard", acoes: ["visualizar", "exportar"] },
  { chave: "rs_levantamento", nome: "R&S — Levantamento", acoes: ["visualizar", "exportar"] },
  {
    chave: "mensagens_diarias",
    nome: "Mensagem do Dia",
    acoes: ["visualizar", "criar", "editar", "excluir"],
  },
  {
    chave: "levantamento_diario",
    nome: "Levantamento Diário",
    acoes: [
      "visualizar",
      "detalhar",
      "configurar",
      "reprocessar",
      "exportar",
      "receber_notificacao",
    ],
  },
];

export const ACAO_ROTULO: Record<Acao, string> = {
  visualizar: "Visualizar",
  criar: "Criar",
  editar: "Editar",
  excluir: "Excluir",
  exportar: "Exportar",
  utilizar: "Utilizar",
  administrar: "Administrar",
  conferir: "Conferir",
  validar: "Validar",
  apontar_divergencia: "Apontar divergência",
  resolver_divergencia: "Resolver divergência",
  historico: "Histórico",
  processar: "Processar",
  arquivar: "Arquivar",
  restaurar: "Restaurar",
  editar_aguardando_confirmacao: "Editar aguardando confirmação",
  detalhar: "Detalhar",
  configurar: "Configurar",
  reprocessar: "Reprocessar",
  receber_notificacao: "Receber notificação",
};

/** Rota → módulo correspondente (usado no menu e no bloqueio de rotas). */
export const MODULO_POR_ROTA: Record<string, string> = {
  "/": "dashboard",
  "/minha-programacao": "programacao",
  "/vagas": "vagas",
  "/candidatos": "candidatos",
  "/confirmacoes": "confirmacoes",
  "/atendimento": "atendimento",
  "/pagamentos": "pagamentos",
  "/programadoras": "programadoras",
  "/colaboradores": "equipe",
  "/empresas": "empresas",
  "/metas": "metas",
  "/bloqueios": "bloqueios",
  "/banco-colaboradores": "banco_colaboradores",
  "/performance": "performance",
  "/analise": "analise",
  "/radar": "radar",
  "/comparar": "comparar",
  "/relatorios": "relatorios",
  "/feedback/dashboard": "feedback_dashboard",
  "/feedback": "feedback",

  "/captacao": "captacao",
  "/chat": "chat",
  "/administracao": "administracao",
  "/importar": "importar",
  "/historico": "historico",
  "/auditoria": "auditoria",
  "/acessos": "acessos",
  "/backups": "backups",
  "/banco-dados": "banco_dados",
  "/configuracoes": "configuracoes",
  "/saude-sistema": "saude",
  "/perfis": "perfis",
  "/rs/candidatos": "rs_candidatos",
  "/rs/empresas": "rs_empresas",
  "/rs/dashboard": "rs_dashboard",
  "/rs/levantamento": "rs_levantamento",
  "/levantamento-diario": "levantamento_diario",
};

/** Ação mínima exigida para abrir cada módulo. */
export function acaoDeEntrada(modulo: string): Acao {
  return modulo === "chat" ? "utilizar" : "visualizar";
}

export function moduloDaRota(pathname: string): string | null {
  if (pathname === "/") return "dashboard";
  const chave = Object.keys(MODULO_POR_ROTA)
    .filter((r) => r !== "/" && pathname.startsWith(r))
    .sort((a, b) => b.length - a.length)[0];
  return chave ? (MODULO_POR_ROTA[chave] ?? null) : null;
}

/** Permissões efetivas do usuário logado (perfil + exceções individuais). */
export function usePermissoes() {
  const { session, isAdmin, carregando } = useAuth();
  const uid = session?.user.id ?? null;

  const consulta = useQuery({
    queryKey: ["permissoes", uid],
    enabled: !!uid,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("minhas_permissoes");
      if (error) throw error;
      const mapa = new Set<string>();
      for (const linha of data ?? []) {
        if (linha.permitido) mapa.add(`${linha.modulo}:${linha.acao}`);
      }
      return mapa;
    },
  });

  return useMemo(() => {
    const conjunto = consulta.data ?? new Set<string>();
    const prontas = !carregando && !!uid && consulta.isSuccess;
    const pode = (modulo: string, acao: Acao = "visualizar") => {
      if (!prontas) return isAdmin;
      return conjunto.has(`${modulo}:${acao}`);
    };
    return {
      carregando: !prontas,
      pode,
      podeAbrir: (modulo: string) => pode(modulo, acaoDeEntrada(modulo)),
      permissoes: conjunto,
    };
  }, [consulta.data, consulta.isSuccess, carregando, uid, isAdmin]);
}
