/** Catálogo seguro de entidades administráveis na área Banco de Dados. */
export interface CampoEntidade {
  chave: string;
  rotulo: string;
  tipo: "texto" | "numero" | "data" | "booleano";
  editavel?: boolean;
}

export interface EntidadeBanco {
  chave: string;
  tabela: string;
  nome: string;
  descricao: string;
  ordem: string;
  busca: string[];
  campos: CampoEntidade[];
  /** Coluna usada para arquivar/desativar em vez de excluir. */
  arquivar?: { coluna: string; ativo: unknown; inativo: unknown };
  /** Impede exclusão definitiva pela interface. */
  somenteLeitura?: boolean;
  protegida?: boolean;
  /** Registros que dependem desta entidade (verificados antes de excluir). */
  dependencias?: { tabela: string; coluna: string; rotulo: string }[];
  filtroStatus?: { coluna: string; opcoes: { valor: string; rotulo: string }[] };
}

export const ENTIDADES: EntidadeBanco[] = [
  {
    chave: "profiles",
    tabela: "profiles",
    nome: "Usuários",
    descricao: "Contas de acesso ao Recruta+",
    ordem: "nome",
    busca: ["nome", "email"],
    campos: [
      { chave: "nome", rotulo: "Nome", tipo: "texto", editavel: true },
      { chave: "email", rotulo: "E-mail", tipo: "texto" },
      { chave: "ativo", rotulo: "Ativo", tipo: "booleano", editavel: true },
      { chave: "master", rotulo: "Master", tipo: "booleano" },
      { chave: "ultimo_acesso", rotulo: "Último acesso", tipo: "data" },
    ],
    arquivar: { coluna: "ativo", ativo: true, inativo: false },
    protegida: true,
  },
  {
    chave: "empresas",
    tabela: "empresas",
    nome: "Empresas",
    descricao: "Empresas atendidas pela operação",
    ordem: "nome",
    busca: ["nome"],
    campos: [
      { chave: "nome", rotulo: "Nome", tipo: "texto", editavel: true },
      { chave: "ativo", rotulo: "Ativa", tipo: "booleano", editavel: true },
      { chave: "created_at", rotulo: "Cadastro", tipo: "data" },
    ],
    arquivar: { coluna: "ativo", ativo: true, inativo: false },
    dependencias: [{ tabela: "vagas", coluna: "empresa_id", rotulo: "programações" }],
  },
  {
    chave: "colaboradores",
    tabela: "colaboradores",
    nome: "Colaboradores (equipe)",
    descricao: "Programadoras e responsáveis pelas programações",
    ordem: "nome",
    busca: ["nome"],
    campos: [
      { chave: "nome", rotulo: "Nome", tipo: "texto", editavel: true },
      { chave: "ativo", rotulo: "Ativo", tipo: "booleano", editavel: true },
      { chave: "created_at", rotulo: "Cadastro", tipo: "data" },
    ],
    arquivar: { coluna: "ativo", ativo: true, inativo: false },
    dependencias: [{ tabela: "vagas", coluna: "colaborador_id", rotulo: "programações" }],
  },
  {
    chave: "candidatos",
    tabela: "candidatos",
    nome: "Candidatos",
    descricao: "Candidatos cadastrados pelas fichas",
    ordem: "nome",
    busca: ["nome", "cpf", "telefone"],
    campos: [
      { chave: "nome", rotulo: "Nome", tipo: "texto", editavel: true },
      { chave: "cpf", rotulo: "CPF", tipo: "texto" },
      { chave: "telefone", rotulo: "Telefone", tipo: "texto", editavel: true },
      { chave: "created_at", rotulo: "Cadastro", tipo: "data" },
    ],
    dependencias: [{ tabela: "vagas", coluna: "candidato_id", rotulo: "programações" }],
  },
  {
    chave: "vagas",
    tabela: "vagas",
    nome: "Programações / Vagas",
    descricao: "Presenças, faltas, cancelamentos e vagas fechadas",
    ordem: "data",
    busca: ["cargo", "descricao", "responsavel", "local"],
    campos: [
      { chave: "data", rotulo: "Data", tipo: "data" },
      { chave: "cargo", rotulo: "Cargo", tipo: "texto", editavel: true },
      { chave: "status", rotulo: "Status", tipo: "texto", editavel: true },
      { chave: "situacao", rotulo: "Situação", tipo: "texto", editavel: true },
      { chave: "quantidade", rotulo: "Qtd.", tipo: "numero", editavel: true },
      { chave: "responsavel", rotulo: "Responsável", tipo: "texto", editavel: true },
      { chave: "observacao", rotulo: "Observação", tipo: "texto", editavel: true },
    ],
    filtroStatus: {
      coluna: "status",
      opcoes: [
        { valor: "PRESENCA", rotulo: "Presenças" },
        { valor: "FALTA", rotulo: "Faltas" },
        { valor: "CANCELADO", rotulo: "Cancelamentos" },
        { valor: "AGUARDANDO", rotulo: "Aguardando confirmação" },
      ],
    },
  },
  {
    chave: "daily_workers",
    tabela: "daily_workers",
    nome: "Banco de Colaboradores (diárias)",
    descricao: "Cadastros recebidos pelo portal público",
    ordem: "created_at",
    busca: ["full_name", "phone", "city", "neighborhood", "desired_role"],
    campos: [
      { chave: "full_name", rotulo: "Nome", tipo: "texto", editavel: true },
      { chave: "phone", rotulo: "Telefone", tipo: "texto", editavel: true },
      { chave: "city", rotulo: "Cidade", tipo: "texto", editavel: true },
      { chave: "neighborhood", rotulo: "Bairro", tipo: "texto", editavel: true },
      { chave: "desired_role", rotulo: "Função", tipo: "texto", editavel: true },
      { chave: "status", rotulo: "Status", tipo: "texto", editavel: true },
      { chave: "created_at", rotulo: "Cadastro", tipo: "data" },
    ],
    arquivar: { coluna: "status", ativo: "disponivel", inativo: "indisponivel" },
  },
  {
    chave: "colaboradores_bloqueados",
    tabela: "colaboradores_bloqueados",
    nome: "Bloqueios",
    descricao: "Colaboradores bloqueados por CPF",
    ordem: "created_at",
    busca: ["nome", "cpf", "motivo"],
    campos: [
      { chave: "nome", rotulo: "Nome", tipo: "texto", editavel: true },
      { chave: "cpf", rotulo: "CPF", tipo: "texto" },
      { chave: "motivo", rotulo: "Motivo", tipo: "texto", editavel: true },
      { chave: "created_at", rotulo: "Data", tipo: "data" },
    ],
  },
  {
    chave: "notificacoes",
    tabela: "notificacoes",
    nome: "Notificações",
    descricao: "Avisos enviados dentro do sistema",
    ordem: "created_at",
    busca: ["titulo", "mensagem", "tipo"],
    campos: [
      { chave: "titulo", rotulo: "Título", tipo: "texto" },
      { chave: "mensagem", rotulo: "Mensagem", tipo: "texto" },
      { chave: "tipo", rotulo: "Tipo", tipo: "texto" },
      { chave: "lida", rotulo: "Lida", tipo: "booleano", editavel: true },
      { chave: "created_at", rotulo: "Data", tipo: "data" },
    ],
  },
  {
    chave: "importacoes",
    tabela: "importacoes",
    nome: "Importações de planilha",
    descricao: "Histórico de importações (recurso secundário)",
    ordem: "data_importacao",
    busca: ["nome_arquivo", "usuario", "status"],
    campos: [
      { chave: "nome_arquivo", rotulo: "Arquivo", tipo: "texto" },
      { chave: "usuario", rotulo: "Usuário", tipo: "texto" },
      { chave: "quantidade_registros", rotulo: "Registros", tipo: "numero" },
      { chave: "status", rotulo: "Status", tipo: "texto" },
      { chave: "data_importacao", rotulo: "Data", tipo: "data" },
    ],
  },
  {
    chave: "quinzenas_historico",
    tabela: "quinzenas_historico",
    nome: "Históricos de quinzena",
    descricao: "Fechamentos quinzenais consolidados",
    ordem: "fechada_em",
    busca: ["chave"],
    campos: [
      { chave: "chave", rotulo: "Quinzena", tipo: "texto" },
      { chave: "inicio", rotulo: "Início", tipo: "data" },
      { chave: "fim", rotulo: "Fim", tipo: "data" },
      { chave: "fechada_em", rotulo: "Fechada em", tipo: "data" },
    ],
    somenteLeitura: true,
    protegida: true,
  },
  {
    chave: "auditoria",
    tabela: "auditoria",
    nome: "Histórico de alterações",
    descricao: "Auditoria de todas as alterações administrativas",
    ordem: "created_at",
    busca: ["tabela", "descricao", "usuario_nome", "campo"],
    campos: [
      { chave: "created_at", rotulo: "Data", tipo: "data" },
      { chave: "usuario_nome", rotulo: "Usuário", tipo: "texto" },
      { chave: "tabela", rotulo: "Entidade", tipo: "texto" },
      { chave: "acao", rotulo: "Operação", tipo: "texto" },
      { chave: "descricao", rotulo: "Registro", tipo: "texto" },
      { chave: "campo", rotulo: "Campo", tipo: "texto" },
      { chave: "valor_anterior", rotulo: "Antes", tipo: "texto" },
      { chave: "valor_novo", rotulo: "Depois", tipo: "texto" },
    ],
    somenteLeitura: true,
    protegida: true,
  },
];

export function entidadePorChave(chave: string) {
  return ENTIDADES.find((e) => e.chave === chave) ?? null;
}
