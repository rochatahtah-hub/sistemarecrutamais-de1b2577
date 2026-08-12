export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_pin: {
        Row: {
          bloqueado_ate: string | null
          falhas: number
          id: boolean
          pin_hash: string
          updated_at: string
        }
        Insert: {
          bloqueado_ate?: string | null
          falhas?: number
          id?: boolean
          pin_hash: string
          updated_at?: string
        }
        Update: {
          bloqueado_ate?: string | null
          falhas?: number
          id?: boolean
          pin_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      alertas_operacao: {
        Row: {
          chave: string
          created_at: string
          detalhe: string
          id: string
          itens: Json
          nivel: string
          observacao: string
          resolvido_em: string | null
          resolvido_por: string | null
          resolvido_por_nome: string
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          chave: string
          created_at?: string
          detalhe?: string
          id?: string
          itens?: Json
          nivel?: string
          observacao?: string
          resolvido_em?: string | null
          resolvido_por?: string | null
          resolvido_por_nome?: string
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          chave?: string
          created_at?: string
          detalhe?: string
          id?: string
          itens?: Json
          nivel?: string
          observacao?: string
          resolvido_em?: string | null
          resolvido_por?: string | null
          resolvido_por_nome?: string
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      auditoria: {
        Row: {
          acao: string
          campo: string
          created_at: string
          descricao: string
          id: string
          registro_id: string | null
          tabela: string
          usuario_id: string | null
          usuario_nome: string
          valor_anterior: string
          valor_novo: string
        }
        Insert: {
          acao: string
          campo?: string
          created_at?: string
          descricao?: string
          id?: string
          registro_id?: string | null
          tabela: string
          usuario_id?: string | null
          usuario_nome?: string
          valor_anterior?: string
          valor_novo?: string
        }
        Update: {
          acao?: string
          campo?: string
          created_at?: string
          descricao?: string
          id?: string
          registro_id?: string | null
          tabela?: string
          usuario_id?: string | null
          usuario_nome?: string
          valor_anterior?: string
          valor_novo?: string
        }
        Relationships: []
      }
      backup_agendamento: {
        Row: {
          ativo: boolean
          created_at: string
          dia_mes: number
          dia_semana: number
          email_destino: string
          formato: string
          frequencia: string
          hora: number
          id: boolean
          proxima_execucao: string | null
          retencao_dias: number
          ultima_execucao: string | null
          ultimo_envio_em: string | null
          ultimo_envio_erro: string
          ultimo_envio_status: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dia_mes?: number
          dia_semana?: number
          email_destino?: string
          formato?: string
          frequencia?: string
          hora?: number
          id?: boolean
          proxima_execucao?: string | null
          retencao_dias?: number
          ultima_execucao?: string | null
          ultimo_envio_em?: string | null
          ultimo_envio_erro?: string
          ultimo_envio_status?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dia_mes?: number
          dia_semana?: number
          email_destino?: string
          formato?: string
          frequencia?: string
          hora?: number
          id?: boolean
          proxima_execucao?: string | null
          retencao_dias?: number
          ultima_execucao?: string | null
          ultimo_envio_em?: string | null
          ultimo_envio_erro?: string
          ultimo_envio_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      backups: {
        Row: {
          arquivo_nome: string
          arquivo_path: string
          concluido_em: string | null
          created_at: string
          criado_por: string | null
          criado_por_nome: string
          duracao_ms: number
          envio_em: string | null
          envio_email: string
          envio_status: string
          erro: string
          formato: string
          id: string
          origem: string
          status: string
          tamanho_bytes: number
          total_registros: number
          total_tabelas: number
          updated_at: string
        }
        Insert: {
          arquivo_nome?: string
          arquivo_path?: string
          concluido_em?: string | null
          created_at?: string
          criado_por?: string | null
          criado_por_nome?: string
          duracao_ms?: number
          envio_em?: string | null
          envio_email?: string
          envio_status?: string
          erro?: string
          formato?: string
          id?: string
          origem?: string
          status?: string
          tamanho_bytes?: number
          total_registros?: number
          total_tabelas?: number
          updated_at?: string
        }
        Update: {
          arquivo_nome?: string
          arquivo_path?: string
          concluido_em?: string | null
          created_at?: string
          criado_por?: string | null
          criado_por_nome?: string
          duracao_ms?: number
          envio_em?: string | null
          envio_email?: string
          envio_status?: string
          erro?: string
          formato?: string
          id?: string
          origem?: string
          status?: string
          tamanho_bytes?: number
          total_registros?: number
          total_tabelas?: number
          updated_at?: string
        }
        Relationships: []
      }
      candidatos: {
        Row: {
          cpf: string
          created_at: string
          criado_por: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cpf: string
          created_at?: string
          criado_por?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cpf?: string
          created_at?: string
          criado_por?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      colaboradores: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      colaboradores_bloqueados: {
        Row: {
          bloqueado_por: string | null
          bloqueado_por_nome: string
          cpf: string
          created_at: string
          id: string
          motivo: string
          nome: string
          updated_at: string
        }
        Insert: {
          bloqueado_por?: string | null
          bloqueado_por_nome?: string
          cpf: string
          created_at?: string
          id?: string
          motivo?: string
          nome?: string
          updated_at?: string
        }
        Update: {
          bloqueado_por?: string | null
          bloqueado_por_nome?: string
          cpf?: string
          created_at?: string
          id?: string
          motivo?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          chave: string
          id: string
          updated_at: string
          valor: Json
        }
        Insert: {
          chave: string
          id?: string
          updated_at?: string
          valor: Json
        }
        Update: {
          chave?: string
          id?: string
          updated_at?: string
          valor?: Json
        }
        Relationships: []
      }
      conversa_participantes: {
        Row: {
          admin: boolean
          conversa_id: string
          created_at: string
          id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          admin?: boolean
          conversa_id: string
          created_at?: string
          id?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          admin?: boolean
          conversa_id?: string
          created_at?: string
          id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversa_participantes_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      conversas: {
        Row: {
          chave_direta: string | null
          created_at: string
          criado_por: string | null
          descricao: string
          foto_url: string
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          chave_direta?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string
          foto_url?: string
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          chave_direta?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string
          foto_url?: string
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      empresas: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      erros_sistema: {
        Row: {
          categoria: string
          codigo_http: number | null
          componente: string
          created_at: string
          endpoint: string
          fingerprint: string
          id: string
          mensagem: string
          navegador: string
          ocorrencias: number
          operacao: string
          pagina: string
          primeira_ocorrencia: string
          sistema_operacional: string
          stack: string | null
          ultima_ocorrencia: string
          updated_at: string
          user_agent: string
          user_id: string | null
        }
        Insert: {
          categoria?: string
          codigo_http?: number | null
          componente?: string
          created_at?: string
          endpoint?: string
          fingerprint: string
          id?: string
          mensagem: string
          navegador?: string
          ocorrencias?: number
          operacao?: string
          pagina?: string
          primeira_ocorrencia?: string
          sistema_operacional?: string
          stack?: string | null
          ultima_ocorrencia?: string
          updated_at?: string
          user_agent?: string
          user_id?: string | null
        }
        Update: {
          categoria?: string
          codigo_http?: number | null
          componente?: string
          created_at?: string
          endpoint?: string
          fingerprint?: string
          id?: string
          mensagem?: string
          navegador?: string
          ocorrencias?: number
          operacao?: string
          pagina?: string
          primeira_ocorrencia?: string
          sistema_operacional?: string
          stack?: string | null
          ultima_ocorrencia?: string
          updated_at?: string
          user_agent?: string
          user_id?: string | null
        }
        Relationships: []
      }
      importacoes: {
        Row: {
          created_at: string
          data_importacao: string
          erros: number
          id: string
          nome_arquivo: string
          quantidade_registros: number
          registros_adicionados: number
          registros_atualizados: number
          registros_ignorados: number
          status: string
          usuario: string
        }
        Insert: {
          created_at?: string
          data_importacao?: string
          erros?: number
          id?: string
          nome_arquivo: string
          quantidade_registros?: number
          registros_adicionados?: number
          registros_atualizados?: number
          registros_ignorados?: number
          status?: string
          usuario?: string
        }
        Update: {
          created_at?: string
          data_importacao?: string
          erros?: number
          id?: string
          nome_arquivo?: string
          quantidade_registros?: number
          registros_adicionados?: number
          registros_atualizados?: number
          registros_ignorados?: number
          status?: string
          usuario?: string
        }
        Relationships: []
      }
      mensagens: {
        Row: {
          anexo_mime: string
          anexo_nome: string
          anexo_path: string
          anexo_tamanho: number
          autor_id: string | null
          conteudo: string
          conversa_id: string
          created_at: string
          duracao_ms: number
          excluida: boolean
          id: string
          responde_a: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          anexo_mime?: string
          anexo_nome?: string
          anexo_path?: string
          anexo_tamanho?: number
          autor_id?: string | null
          conteudo?: string
          conversa_id: string
          created_at?: string
          duracao_ms?: number
          excluida?: boolean
          id?: string
          responde_a?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          anexo_mime?: string
          anexo_nome?: string
          anexo_path?: string
          anexo_tamanho?: number
          autor_id?: string | null
          conteudo?: string
          conversa_id?: string
          created_at?: string
          duracao_ms?: number
          excluida?: boolean
          id?: string
          responde_a?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_responde_a_fkey"
            columns: ["responde_a"]
            isOneToOne: false
            referencedRelation: "mensagens"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          chave: string | null
          created_at: string
          id: string
          lida: boolean
          mensagem: string
          para_admin: boolean
          tipo: string
          titulo: string
          user_id: string | null
        }
        Insert: {
          chave?: string | null
          created_at?: string
          id?: string
          lida?: boolean
          mensagem: string
          para_admin?: boolean
          tipo: string
          titulo: string
          user_id?: string | null
        }
        Update: {
          chave?: string | null
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string
          para_admin?: boolean
          tipo?: string
          titulo?: string
          user_id?: string | null
        }
        Relationships: []
      }
      presenca_usuarios: {
        Row: {
          online: boolean
          ultimo_visto: string
          updated_at: string
          user_id: string
        }
        Insert: {
          online?: boolean
          ultimo_visto?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          online?: boolean
          ultimo_visto?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar_url: string
          created_at: string
          email: string | null
          id: string
          last_login_at: string | null
          meta_quinzena: number
          nome: string
          ultimo_acesso: string | null
          ultimo_preenchimento: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string
          created_at?: string
          email?: string | null
          id: string
          last_login_at?: string | null
          meta_quinzena?: number
          nome?: string
          ultimo_acesso?: string | null
          ultimo_preenchimento?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string
          created_at?: string
          email?: string | null
          id?: string
          last_login_at?: string | null
          meta_quinzena?: number
          nome?: string
          ultimo_acesso?: string | null
          ultimo_preenchimento?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quinzenas_historico: {
        Row: {
          chave: string
          fechada_em: string
          fim: string
          id: string
          inicio: string
          resumo: Json
        }
        Insert: {
          chave: string
          fechada_em?: string
          fim: string
          id?: string
          inicio: string
          resumo?: Json
        }
        Update: {
          chave?: string
          fechada_em?: string
          fim?: string
          id?: string
          inicio?: string
          resumo?: Json
        }
        Relationships: []
      }
      reacoes_mensagem: {
        Row: {
          conversa_id: string
          created_at: string
          emoji: string
          id: string
          mensagem_id: string
          user_id: string
        }
        Insert: {
          conversa_id: string
          created_at?: string
          emoji: string
          id?: string
          mensagem_id: string
          user_id: string
        }
        Update: {
          conversa_id?: string
          created_at?: string
          emoji?: string
          id?: string
          mensagem_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reacoes_mensagem_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reacoes_mensagem_mensagem_id_fkey"
            columns: ["mensagem_id"]
            isOneToOne: false
            referencedRelation: "mensagens"
            referencedColumns: ["id"]
          },
        ]
      }
      user_access_logs: {
        Row: {
          created_at: string
          id: string
          login_at: string
          navegador: string
          sistema_operacional: string
          user_agent: string
          user_id: string | null
          usuario_nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          login_at?: string
          navegador?: string
          sistema_operacional?: string
          user_agent?: string
          user_id?: string | null
          usuario_nome?: string
        }
        Update: {
          created_at?: string
          id?: string
          login_at?: string
          navegador?: string
          sistema_operacional?: string
          user_agent?: string
          user_id?: string | null
          usuario_nome?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vagas: {
        Row: {
          candidato_id: string | null
          cargo: string
          colaborador_id: string | null
          created_at: string
          data: string
          descricao: string | null
          empresa_id: string | null
          hash_registro: string | null
          horario: string
          id: string
          importacao_id: string | null
          local: string
          observacao: string | null
          origem: string
          programadora_id: string | null
          quantidade: number
          responsavel: string
          situacao: string
          status: string
          updated_at: string
        }
        Insert: {
          candidato_id?: string | null
          cargo?: string
          colaborador_id?: string | null
          created_at?: string
          data: string
          descricao?: string | null
          empresa_id?: string | null
          hash_registro?: string | null
          horario?: string
          id?: string
          importacao_id?: string | null
          local?: string
          observacao?: string | null
          origem?: string
          programadora_id?: string | null
          quantidade?: number
          responsavel?: string
          situacao?: string
          status: string
          updated_at?: string
        }
        Update: {
          candidato_id?: string | null
          cargo?: string
          colaborador_id?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          empresa_id?: string | null
          hash_registro?: string | null
          horario?: string
          id?: string
          importacao_id?: string | null
          local?: string
          observacao?: string | null
          origem?: string
          programadora_id?: string | null
          quantidade?: number
          responsavel?: string
          situacao?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vagas_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vagas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vagas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vagas_importacao_id_fkey"
            columns: ["importacao_id"]
            isOneToOne: false
            referencedRelation: "importacoes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_conversa: {
        Args: { _conversa: string; _user: string }
        Returns: boolean
      }
      criador_conversa: {
        Args: { _conversa: string; _user: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      participa_conversa: {
        Args: { _conversa: string; _user: string }
        Returns: boolean
      }
      registrar_acesso: {
        Args: {
          _navegador?: string
          _sistema_operacional?: string
          _user_agent?: string
        }
        Returns: string
      }
      registrar_erro_sistema: {
        Args: {
          _categoria: string
          _codigo_http: number
          _componente: string
          _endpoint: string
          _fingerprint: string
          _mensagem: string
          _navegador: string
          _operacao: string
          _pagina: string
          _sistema_operacional: string
          _stack: string
          _user_agent: string
        }
        Returns: string
      }
      resumo_saude_sistema: {
        Args: never
        Returns: {
          categoria: string
          codigo_http: number
          componente: string
          endpoint: string
          ocorrencias: number
          ultima_ocorrencia: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "programadora"
        | "coordenador"
        | "supervisor"
        | "comercial"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "programadora",
        "coordenador",
        "supervisor",
        "comercial",
      ],
    },
  },
} as const
