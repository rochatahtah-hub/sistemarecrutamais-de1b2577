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
    PostgrestVersion: "14.5"
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
          tenant_id: string
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
          tenant_id?: string
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
          tenant_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_operacao_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      app_user_connections: {
        Row: {
          connection_key_ciphertext: string
          connector_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_key_ciphertext: string
          connector_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_key_ciphertext?: string
          connector_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      atendimento_conferencias: {
        Row: {
          adicional_motivo: string
          adicional_percentual: number
          ajuda_custo_valor: number
          checklist: Json
          created_at: string
          horario_realizado_entrada: string
          horario_realizado_saida: string
          horas_trabalhadas: number | null
          id: string
          jornada_completa: string | null
          motivo_jornada_parcial: string
          observacao: string
          status_validacao: string
          tem_ajuda_custo: boolean
          tenant_id: string
          tipo_adicional: string
          total_estimado: number | null
          updated_at: string
          vaga_id: string
          validado_em: string | null
          validado_por: string | null
          validado_por_nome: string
          valor_diaria: number | null
        }
        Insert: {
          adicional_motivo?: string
          adicional_percentual?: number
          ajuda_custo_valor?: number
          checklist?: Json
          created_at?: string
          horario_realizado_entrada?: string
          horario_realizado_saida?: string
          horas_trabalhadas?: number | null
          id?: string
          jornada_completa?: string | null
          motivo_jornada_parcial?: string
          observacao?: string
          status_validacao?: string
          tem_ajuda_custo?: boolean
          tenant_id?: string
          tipo_adicional?: string
          total_estimado?: number | null
          updated_at?: string
          vaga_id: string
          validado_em?: string | null
          validado_por?: string | null
          validado_por_nome?: string
          valor_diaria?: number | null
        }
        Update: {
          adicional_motivo?: string
          adicional_percentual?: number
          ajuda_custo_valor?: number
          checklist?: Json
          created_at?: string
          horario_realizado_entrada?: string
          horario_realizado_saida?: string
          horas_trabalhadas?: number | null
          id?: string
          jornada_completa?: string | null
          motivo_jornada_parcial?: string
          observacao?: string
          status_validacao?: string
          tem_ajuda_custo?: boolean
          tenant_id?: string
          tipo_adicional?: string
          total_estimado?: number | null
          updated_at?: string
          vaga_id?: string
          validado_em?: string | null
          validado_por?: string | null
          validado_por_nome?: string
          valor_diaria?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "atendimento_conferencias_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimento_conferencias_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: true
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      atendimento_divergencias: {
        Row: {
          aberta_em: string
          aberta_por: string | null
          aberta_por_nome: string
          conferencia_id: string
          created_at: string
          id: string
          observacao: string
          resolvida_em: string | null
          resolvida_por: string | null
          resolvida_por_nome: string
          resultado: string
          status: string
          tenant_id: string
          tipo: string
          updated_at: string
          vaga_id: string
        }
        Insert: {
          aberta_em?: string
          aberta_por?: string | null
          aberta_por_nome?: string
          conferencia_id: string
          created_at?: string
          id?: string
          observacao?: string
          resolvida_em?: string | null
          resolvida_por?: string | null
          resolvida_por_nome?: string
          resultado?: string
          status?: string
          tenant_id?: string
          tipo?: string
          updated_at?: string
          vaga_id: string
        }
        Update: {
          aberta_em?: string
          aberta_por?: string | null
          aberta_por_nome?: string
          conferencia_id?: string
          created_at?: string
          id?: string
          observacao?: string
          resolvida_em?: string | null
          resolvida_por?: string | null
          resolvida_por_nome?: string
          resultado?: string
          status?: string
          tenant_id?: string
          tipo?: string
          updated_at?: string
          vaga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atendimento_divergencias_conferencia_id_fkey"
            columns: ["conferencia_id"]
            isOneToOne: false
            referencedRelation: "atendimento_conferencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimento_divergencias_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimento_divergencias_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string
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
          tenant_id?: string
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
          tenant_id?: string
          usuario_id?: string | null
          usuario_nome?: string
          valor_anterior?: string
          valor_novo?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string
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
          tenant_id?: string
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
          tenant_id?: string
          ultima_execucao?: string | null
          ultimo_envio_em?: string | null
          ultimo_envio_erro?: string
          ultimo_envio_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_agendamento_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      backups: {
        Row: {
          arquivo_nome: string
          arquivo_path: string
          concluido_em: string | null
          created_at: string
          criado_por: string | null
          criado_por_nome: string
          drive_em: string | null
          drive_erro: string
          drive_file_id: string
          drive_link: string
          drive_status: string
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
          tenant_id: string
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
          drive_em?: string | null
          drive_erro?: string
          drive_file_id?: string
          drive_link?: string
          drive_status?: string
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
          tenant_id?: string
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
          drive_em?: string | null
          drive_erro?: string
          drive_file_id?: string
          drive_link?: string
          drive_status?: string
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
          tenant_id?: string
          total_registros?: number
          total_tabelas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backups_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      candidatos: {
        Row: {
          cpf: string
          created_at: string
          criado_por: string | null
          documento_nome: string
          documento_path: string
          funcao: string
          id: string
          nome: string
          pix_chave: string
          precisa_fretado: boolean
          telefone: string | null
          tenant_id: string
          transporte_observacao: string
          transporte_proprio: boolean
          transporte_tipos: string[]
          updated_at: string
        }
        Insert: {
          cpf: string
          created_at?: string
          criado_por?: string | null
          documento_nome?: string
          documento_path?: string
          funcao?: string
          id?: string
          nome: string
          pix_chave?: string
          precisa_fretado?: boolean
          telefone?: string | null
          tenant_id?: string
          transporte_observacao?: string
          transporte_proprio?: boolean
          transporte_tipos?: string[]
          updated_at?: string
        }
        Update: {
          cpf?: string
          created_at?: string
          criado_por?: string | null
          documento_nome?: string
          documento_path?: string
          funcao?: string
          id?: string
          nome?: string
          pix_chave?: string
          precisa_fretado?: boolean
          telefone?: string | null
          tenant_id?: string
          transporte_observacao?: string
          transporte_proprio?: boolean
          transporte_tipos?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidatos_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      captacao_candidaturas: {
        Row: {
          cpf: string
          created_at: string
          curriculo_nome: string
          curriculo_path: string
          daily_worker_id: string | null
          id: string
          nome: string
          observacao: string
          oportunidade_id: string
          status: string
          telefone: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cpf?: string
          created_at?: string
          curriculo_nome?: string
          curriculo_path?: string
          daily_worker_id?: string | null
          id?: string
          nome?: string
          observacao?: string
          oportunidade_id: string
          status?: string
          telefone?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          cpf?: string
          created_at?: string
          curriculo_nome?: string
          curriculo_path?: string
          daily_worker_id?: string | null
          id?: string
          nome?: string
          observacao?: string
          oportunidade_id?: string
          status?: string
          telefone?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "captacao_candidaturas_daily_worker_id_fkey"
            columns: ["daily_worker_id"]
            isOneToOne: false
            referencedRelation: "daily_workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "captacao_candidaturas_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "captacao_oportunidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "captacao_candidaturas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      captacao_config: {
        Row: {
          clt_ativa: boolean
          created_at: string
          diarias_ativa: boolean
          id: string
          oportunidades_ativa: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          clt_ativa?: boolean
          created_at?: string
          diarias_ativa?: boolean
          id?: string
          oportunidades_ativa?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          clt_ativa?: boolean
          created_at?: string
          diarias_ativa?: boolean
          id?: string
          oportunidades_ativa?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "captacao_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      captacao_oportunidades: {
        Row: {
          arquivada_em: string | null
          bairro: string | null
          cidade: string | null
          created_at: string
          criado_por: string | null
          criado_por_nome: string
          curriculo_obrigatorio: boolean
          data_oportunidade: string | null
          descricao: string
          genero: string | null
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          informacoes_adicionais: string
          intervalo_fim: string | null
          intervalo_inicio: string | null
          modalidade: string
          requisitos: string
          status: string
          tenant_id: string
          titulo: string
          transporte_detalhes: string | null
          transporte_tipo: string | null
          updated_at: string
          vaga_id: string | null
        }
        Insert: {
          arquivada_em?: string | null
          bairro?: string | null
          cidade?: string | null
          created_at?: string
          criado_por?: string | null
          criado_por_nome?: string
          curriculo_obrigatorio?: boolean
          data_oportunidade?: string | null
          descricao?: string
          genero?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          informacoes_adicionais?: string
          intervalo_fim?: string | null
          intervalo_inicio?: string | null
          modalidade: string
          requisitos?: string
          status?: string
          tenant_id?: string
          titulo?: string
          transporte_detalhes?: string | null
          transporte_tipo?: string | null
          updated_at?: string
          vaga_id?: string | null
        }
        Update: {
          arquivada_em?: string | null
          bairro?: string | null
          cidade?: string | null
          created_at?: string
          criado_por?: string | null
          criado_por_nome?: string
          curriculo_obrigatorio?: boolean
          data_oportunidade?: string | null
          descricao?: string
          genero?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          informacoes_adicionais?: string
          intervalo_fim?: string | null
          intervalo_inicio?: string | null
          modalidade?: string
          requisitos?: string
          status?: string
          tenant_id?: string
          titulo?: string
          transporte_detalhes?: string | null
          transporte_tipo?: string | null
          updated_at?: string
          vaga_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "captacao_oportunidades_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "captacao_oportunidades_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores_bloqueados: {
        Row: {
          ativo: boolean
          bloqueado_por: string | null
          bloqueado_por_nome: string
          candidato_id: string | null
          cpf: string
          created_at: string
          empresa_id: string | null
          id: string
          motivo: string
          nome: string
          telefone: string
          tenant_id: string
          tipo_bloqueio: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bloqueado_por?: string | null
          bloqueado_por_nome?: string
          candidato_id?: string | null
          cpf: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          motivo?: string
          nome?: string
          telefone?: string
          tenant_id?: string
          tipo_bloqueio?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bloqueado_por?: string | null
          bloqueado_por_nome?: string
          candidato_id?: string | null
          cpf?: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          motivo?: string
          nome?: string
          telefone?: string
          tenant_id?: string
          tipo_bloqueio?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_bloqueados_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_bloqueados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_bloqueados_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          chave: string
          id: string
          tenant_id: string
          updated_at: string
          valor: Json
        }
        Insert: {
          chave: string
          id?: string
          tenant_id?: string
          updated_at?: string
          valor: Json
        }
        Update: {
          chave?: string
          id?: string
          tenant_id?: string
          updated_at?: string
          valor?: Json
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string
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
          tenant_id?: string
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
          tenant_id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversas_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_secrets: {
        Row: {
          created_at: string
          nome: string
          valor: string
        }
        Insert: {
          created_at?: string
          nome: string
          valor: string
        }
        Update: {
          created_at?: string
          nome?: string
          valor?: string
        }
        Relationships: []
      }
      daily_workers: {
        Row: {
          available_days: string[]
          available_for_daily: boolean
          available_periods: string[]
          city: string
          consent_accepted: boolean
          consent_date: string | null
          cpf: string
          cpf_mascara: string | null
          created_at: string
          desired_role: string
          documento_nome: string
          documento_path: string
          full_name: string
          id: string
          neighborhood: string
          observacao: string
          phone: string
          pix_chave: string
          precisa_fretado: boolean
          status: string
          tenant_id: string
          transporte_observacao: string
          transporte_proprio: boolean
          transporte_tipos: string[]
          updated_at: string
        }
        Insert: {
          available_days?: string[]
          available_for_daily?: boolean
          available_periods?: string[]
          city: string
          consent_accepted?: boolean
          consent_date?: string | null
          cpf?: string
          cpf_mascara?: string | null
          created_at?: string
          desired_role?: string
          documento_nome?: string
          documento_path?: string
          full_name: string
          id?: string
          neighborhood: string
          observacao?: string
          phone: string
          pix_chave?: string
          precisa_fretado?: boolean
          status?: string
          tenant_id?: string
          transporte_observacao?: string
          transporte_proprio?: boolean
          transporte_tipos?: string[]
          updated_at?: string
        }
        Update: {
          available_days?: string[]
          available_for_daily?: boolean
          available_periods?: string[]
          city?: string
          consent_accepted?: boolean
          consent_date?: string | null
          cpf?: string
          cpf_mascara?: string | null
          created_at?: string
          desired_role?: string
          documento_nome?: string
          documento_path?: string
          full_name?: string
          id?: string
          neighborhood?: string
          observacao?: string
          phone?: string
          pix_chave?: string
          precisa_fretado?: boolean
          status?: string
          tenant_id?: string
          transporte_observacao?: string
          transporte_proprio?: boolean
          transporte_tipos?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_workers_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      erros_sistema: {
        Row: {
          arquivado_em: string | null
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
          resolvido_em: string | null
          resolvido_por: string | null
          resolvido_por_nome: string
          sistema_operacional: string
          stack: string | null
          status: string
          tenant_id: string
          ultima_ocorrencia: string
          updated_at: string
          user_agent: string
          user_id: string | null
        }
        Insert: {
          arquivado_em?: string | null
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
          resolvido_em?: string | null
          resolvido_por?: string | null
          resolvido_por_nome?: string
          sistema_operacional?: string
          stack?: string | null
          status?: string
          tenant_id?: string
          ultima_ocorrencia?: string
          updated_at?: string
          user_agent?: string
          user_id?: string | null
        }
        Update: {
          arquivado_em?: string | null
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
          resolvido_em?: string | null
          resolvido_por?: string | null
          resolvido_por_nome?: string
          sistema_operacional?: string
          stack?: string | null
          status?: string
          tenant_id?: string
          ultima_ocorrencia?: string
          updated_at?: string
          user_agent?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "erros_sistema_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_config: {
        Row: {
          ativo: boolean
          clt_entrada: boolean
          clt_prazo_dias: number
          clt_semanal: boolean
          created_at: string
          diaria_primeiro_dia: boolean
          diaria_semanal: boolean
          email_responsavel: string
          empresa_id: string | null
          escopo: string
          id: string
          rs_empresa_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          clt_entrada?: boolean
          clt_prazo_dias?: number
          clt_semanal?: boolean
          created_at?: string
          diaria_primeiro_dia?: boolean
          diaria_semanal?: boolean
          email_responsavel?: string
          empresa_id?: string | null
          escopo: string
          id?: string
          rs_empresa_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          clt_entrada?: boolean
          clt_prazo_dias?: number
          clt_semanal?: boolean
          created_at?: string
          diaria_primeiro_dia?: boolean
          diaria_semanal?: boolean
          email_responsavel?: string
          empresa_id?: string | null
          escopo?: string
          id?: string
          rs_empresa_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_config_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_config_rs_empresa_id_fkey"
            columns: ["rs_empresa_id"]
            isOneToOne: false
            referencedRelation: "rs_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_respostas: {
        Row: {
          created_at: string
          feedback_id: string
          id: string
          mencoes: string
          nota: number | null
          observacao: string
          respostas: Json
          tenant_id: string
        }
        Insert: {
          created_at?: string
          feedback_id: string
          id?: string
          mencoes?: string
          nota?: number | null
          observacao?: string
          respostas?: Json
          tenant_id?: string
        }
        Update: {
          created_at?: string
          feedback_id?: string
          id?: string
          mencoes?: string
          nota?: number | null
          observacao?: string
          respostas?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_respostas_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: true
            referencedRelation: "feedbacks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_respostas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      feedbacks: {
        Row: {
          colaborador_nome: string
          created_at: string
          criado_por: string | null
          criado_por_nome: string
          empresa_id: string | null
          empresa_nome: string
          enviado_em: string | null
          enviado_para: string
          envio_status: string
          escopo: string
          id: string
          periodo_fim: string | null
          periodo_inicio: string | null
          respondido_em: string | null
          rs_candidato_id: string | null
          rs_empresa_id: string | null
          status: string
          tenant_id: string
          tipo: string
          token: string
          updated_at: string
          vaga_id: string | null
        }
        Insert: {
          colaborador_nome?: string
          created_at?: string
          criado_por?: string | null
          criado_por_nome?: string
          empresa_id?: string | null
          empresa_nome?: string
          enviado_em?: string | null
          enviado_para?: string
          envio_status?: string
          escopo: string
          id?: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
          respondido_em?: string | null
          rs_candidato_id?: string | null
          rs_empresa_id?: string | null
          status?: string
          tenant_id?: string
          tipo: string
          token: string
          updated_at?: string
          vaga_id?: string | null
        }
        Update: {
          colaborador_nome?: string
          created_at?: string
          criado_por?: string | null
          criado_por_nome?: string
          empresa_id?: string | null
          empresa_nome?: string
          enviado_em?: string | null
          enviado_para?: string
          envio_status?: string
          escopo?: string
          id?: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
          respondido_em?: string | null
          rs_candidato_id?: string | null
          rs_empresa_id?: string | null
          status?: string
          tenant_id?: string
          tipo?: string
          token?: string
          updated_at?: string
          vaga_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_rs_candidato_id_fkey"
            columns: ["rs_candidato_id"]
            isOneToOne: false
            referencedRelation: "rs_candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_rs_empresa_id_fkey"
            columns: ["rs_empresa_id"]
            isOneToOne: false
            referencedRelation: "rs_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      funcoes: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string
          id: string
          nome: string
          perfil_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          id?: string
          nome: string
          perfil_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          id?: string
          nome?: string
          perfil_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funcoes_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis_acesso"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string
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
          tenant_id?: string
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
          tenant_id?: string
          usuario?: string
        }
        Relationships: [
          {
            foreignKeyName: "importacoes_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      levantamento_diario_config: {
        Row: {
          ativo: boolean
          created_at: string
          hora_geracao: number
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          hora_geracao?: number
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          hora_geracao?: number
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "levantamento_diario_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      levantamento_diario_programadores: {
        Row: {
          cancelamentos: number
          created_at: string
          faltas: number
          id: string
          levantamento_id: string
          pct_cancelamento: number
          pct_falta: number
          pct_presenca: number
          presencas: number
          programadora_id: string
          programadora_nome: string
          tenant_id: string
          updated_at: string
          vaga_ids: string[]
          vagas_fechadas: number
        }
        Insert: {
          cancelamentos?: number
          created_at?: string
          faltas?: number
          id?: string
          levantamento_id: string
          pct_cancelamento?: number
          pct_falta?: number
          pct_presenca?: number
          presencas?: number
          programadora_id: string
          programadora_nome?: string
          tenant_id?: string
          updated_at?: string
          vaga_ids?: string[]
          vagas_fechadas?: number
        }
        Update: {
          cancelamentos?: number
          created_at?: string
          faltas?: number
          id?: string
          levantamento_id?: string
          pct_cancelamento?: number
          pct_falta?: number
          pct_presenca?: number
          presencas?: number
          programadora_id?: string
          programadora_nome?: string
          tenant_id?: string
          updated_at?: string
          vaga_ids?: string[]
          vagas_fechadas?: number
        }
        Relationships: [
          {
            foreignKeyName: "levantamento_diario_programadores_levantamento_id_fkey"
            columns: ["levantamento_id"]
            isOneToOne: false
            referencedRelation: "levantamentos_diarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "levantamento_diario_programadores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      levantamentos_diarios: {
        Row: {
          cancelamentos: number
          created_at: string
          data_referencia: string
          faltas: number
          gerado_em: string
          id: string
          origem: string
          pct_cancelamento: number
          pct_falta: number
          pct_presenca: number
          presencas: number
          reprocessado_em: string | null
          reprocessado_por: string | null
          reprocessado_por_nome: string
          tenant_id: string
          updated_at: string
          vagas_fechadas: number
          vezes_reprocessado: number
        }
        Insert: {
          cancelamentos?: number
          created_at?: string
          data_referencia: string
          faltas?: number
          gerado_em?: string
          id?: string
          origem?: string
          pct_cancelamento?: number
          pct_falta?: number
          pct_presenca?: number
          presencas?: number
          reprocessado_em?: string | null
          reprocessado_por?: string | null
          reprocessado_por_nome?: string
          tenant_id?: string
          updated_at?: string
          vagas_fechadas?: number
          vezes_reprocessado?: number
        }
        Update: {
          cancelamentos?: number
          created_at?: string
          data_referencia?: string
          faltas?: number
          gerado_em?: string
          id?: string
          origem?: string
          pct_cancelamento?: number
          pct_falta?: number
          pct_presenca?: number
          presencas?: number
          reprocessado_em?: string | null
          reprocessado_por?: string | null
          reprocessado_por_nome?: string
          tenant_id?: string
          updated_at?: string
          vagas_fechadas?: number
          vezes_reprocessado?: number
        }
        Relationships: [
          {
            foreignKeyName: "levantamentos_diarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string
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
          tenant_id?: string
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
          tenant_id?: string
          tipo?: string
          titulo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          created_at: string
          id: string
          observacao: string
          pago_em: string | null
          pago_por: string | null
          pago_por_nome: string
          status: string
          tenant_id: string
          updated_at: string
          vaga_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          observacao?: string
          pago_em?: string | null
          pago_por?: string | null
          pago_por_nome?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          vaga_id: string
        }
        Update: {
          created_at?: string
          id?: string
          observacao?: string
          pago_em?: string | null
          pago_por?: string | null
          pago_por_nome?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          vaga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: true
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_permissoes: {
        Row: {
          acao: string
          created_at: string
          id: string
          modulo: string
          perfil_id: string
          permitido: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          acao: string
          created_at?: string
          id?: string
          modulo: string
          perfil_id: string
          permitido?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          acao?: string
          created_at?: string
          id?: string
          modulo?: string
          perfil_id?: string
          permitido?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfil_permissoes_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis_acesso"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfil_permissoes_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis_acesso: {
        Row: {
          ativo: boolean
          chave: string
          created_at: string
          descricao: string
          id: string
          nome: string
          sistema: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          chave: string
          created_at?: string
          descricao?: string
          id?: string
          nome: string
          sistema?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          chave?: string
          created_at?: string
          descricao?: string
          id?: string
          nome?: string
          sistema?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfis_acesso_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      permissoes_usuario: {
        Row: {
          acao: string
          created_at: string
          id: string
          modulo: string
          permitido: boolean
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acao: string
          created_at?: string
          id?: string
          modulo: string
          permitido: boolean
          tenant_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acao?: string
          created_at?: string
          id?: string
          modulo?: string
          permitido?: boolean
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissoes_usuario_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      planos: {
        Row: {
          ativo: boolean
          chave: string
          created_at: string
          descricao: string
          id: string
          limites: Json
          modulos: Json
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          chave: string
          created_at?: string
          descricao?: string
          id?: string
          limites?: Json
          modulos?: Json
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          chave?: string
          created_at?: string
          descricao?: string
          id?: string
          limites?: Json
          modulos?: Json
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      presenca_usuarios: {
        Row: {
          online: boolean
          tenant_id: string
          ultimo_visto: string
          updated_at: string
          user_id: string
        }
        Insert: {
          online?: boolean
          tenant_id?: string
          ultimo_visto?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          online?: boolean
          tenant_id?: string
          ultimo_visto?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "presenca_usuarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar_url: string
          created_at: string
          email: string | null
          funcao_id: string | null
          id: string
          last_login_at: string | null
          master: boolean
          meta_quinzena: number
          nome: string
          perfil_id: string | null
          tenant_id: string
          ultimo_acesso: string | null
          ultimo_preenchimento: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string
          created_at?: string
          email?: string | null
          funcao_id?: string | null
          id: string
          last_login_at?: string | null
          master?: boolean
          meta_quinzena?: number
          nome?: string
          perfil_id?: string | null
          tenant_id?: string
          ultimo_acesso?: string | null
          ultimo_preenchimento?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string
          created_at?: string
          email?: string | null
          funcao_id?: string | null
          id?: string
          last_login_at?: string | null
          master?: boolean
          meta_quinzena?: number
          nome?: string
          perfil_id?: string | null
          tenant_id?: string
          ultimo_acesso?: string | null
          ultimo_preenchimento?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "funcoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis_acesso"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quinzenas_historico: {
        Row: {
          chave: string
          fechada_em: string
          fim: string
          id: string
          inicio: string
          resumo: Json
          tenant_id: string
        }
        Insert: {
          chave: string
          fechada_em?: string
          fim: string
          id?: string
          inicio: string
          resumo?: Json
          tenant_id?: string
        }
        Update: {
          chave?: string
          fechada_em?: string
          fim?: string
          id?: string
          inicio?: string
          resumo?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quinzenas_historico_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      rs_candidatos: {
        Row: {
          cargo: string
          cpf: string
          created_at: string
          data_admissao: string | null
          data_desligamento: string | null
          empresa_id: string | null
          id: string
          motivo_desligamento: string
          nome: string
          observacao: string
          recrutador_id: string | null
          recrutador_nome: string
          status: string
          telefone: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cargo?: string
          cpf: string
          created_at?: string
          data_admissao?: string | null
          data_desligamento?: string | null
          empresa_id?: string | null
          id?: string
          motivo_desligamento?: string
          nome: string
          observacao?: string
          recrutador_id?: string | null
          recrutador_nome?: string
          status?: string
          telefone?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          cargo?: string
          cpf?: string
          created_at?: string
          data_admissao?: string | null
          data_desligamento?: string | null
          empresa_id?: string | null
          id?: string
          motivo_desligamento?: string
          nome?: string
          observacao?: string
          recrutador_id?: string | null
          recrutador_nome?: string
          status?: string
          telefone?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rs_candidatos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "rs_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rs_candidatos_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rs_cargos: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rs_cargos_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rs_empresas: {
        Row: {
          ativo: boolean
          cidade: string
          cnpj: string
          contato: string
          created_at: string
          id: string
          nome: string
          observacao: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cidade?: string
          cnpj?: string
          contato?: string
          created_at?: string
          id?: string
          nome: string
          observacao?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cidade?: string
          cnpj?: string
          contato?: string
          created_at?: string
          id?: string
          nome?: string
          observacao?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rs_empresas_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rs_historico: {
        Row: {
          acao: string
          campo: string
          candidato_id: string
          created_at: string
          id: string
          tenant_id: string
          usuario_id: string | null
          usuario_nome: string
          valor_anterior: string
          valor_novo: string
        }
        Insert: {
          acao: string
          campo?: string
          candidato_id: string
          created_at?: string
          id?: string
          tenant_id?: string
          usuario_id?: string | null
          usuario_nome?: string
          valor_anterior?: string
          valor_novo?: string
        }
        Update: {
          acao?: string
          campo?: string
          candidato_id?: string
          created_at?: string
          id?: string
          tenant_id?: string
          usuario_id?: string | null
          usuario_nome?: string
          valor_anterior?: string
          valor_novo?: string
        }
        Relationships: [
          {
            foreignKeyName: "rs_historico_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "rs_candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rs_historico_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string
          observacao: string
          user_id: string
        }
        Insert: {
          created_at?: string
          observacao?: string
          user_id: string
        }
        Update: {
          created_at?: string
          observacao?: string
          user_id?: string
        }
        Relationships: []
      }
      tenant_contexto: {
        Row: {
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_contexto_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          ativo: boolean
          configuracoes: Json
          created_at: string
          dados_comerciais: Json
          id: string
          limites: Json
          nome: string
          plano_id: string | null
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          configuracoes?: Json
          created_at?: string
          dados_comerciais?: Json
          id?: string
          limites?: Json
          nome: string
          plano_id?: string | null
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          configuracoes?: Json
          created_at?: string
          dados_comerciais?: Json
          id?: string
          limites?: Json
          nome?: string
          plano_id?: string | null
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants_log: {
        Row: {
          acao: string
          created_at: string
          detalhe: string
          id: string
          tenant_id: string | null
          tenant_nome: string
          tenant_slug: string
          usuario_id: string | null
          usuario_nome: string
        }
        Insert: {
          acao: string
          created_at?: string
          detalhe?: string
          id?: string
          tenant_id?: string | null
          tenant_nome?: string
          tenant_slug?: string
          usuario_id?: string | null
          usuario_nome?: string
        }
        Update: {
          acao?: string
          created_at?: string
          detalhe?: string
          id?: string
          tenant_id?: string | null
          tenant_nome?: string
          tenant_slug?: string
          usuario_id?: string | null
          usuario_nome?: string
        }
        Relationships: []
      }
      user_access_logs: {
        Row: {
          created_at: string
          id: string
          login_at: string
          navegador: string
          sistema_operacional: string
          tenant_id: string
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
          tenant_id?: string
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
          tenant_id?: string
          user_agent?: string
          user_id?: string | null
          usuario_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_access_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          bairro: string | null
          candidato_id: string | null
          cargo: string
          cidade: string | null
          colaborador_id: string | null
          confirmado_em: string | null
          created_at: string
          data: string
          descricao: string | null
          empresa_id: string | null
          genero: string | null
          hash_registro: string | null
          horario: string
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          importacao_id: string | null
          intervalo_fim: string | null
          intervalo_inicio: string | null
          local: string
          observacao: string | null
          origem: string
          programadora_id: string | null
          quantidade: number
          responsavel: string
          situacao: string
          status: string
          tenant_id: string
          transporte_detalhes: string | null
          transporte_tipo: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          candidato_id?: string | null
          cargo?: string
          cidade?: string | null
          colaborador_id?: string | null
          confirmado_em?: string | null
          created_at?: string
          data: string
          descricao?: string | null
          empresa_id?: string | null
          genero?: string | null
          hash_registro?: string | null
          horario?: string
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          importacao_id?: string | null
          intervalo_fim?: string | null
          intervalo_inicio?: string | null
          local?: string
          observacao?: string | null
          origem?: string
          programadora_id?: string | null
          quantidade?: number
          responsavel?: string
          situacao?: string
          status: string
          tenant_id?: string
          transporte_detalhes?: string | null
          transporte_tipo?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          candidato_id?: string | null
          cargo?: string
          cidade?: string | null
          colaborador_id?: string | null
          confirmado_em?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          empresa_id?: string | null
          genero?: string | null
          hash_registro?: string | null
          horario?: string
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          importacao_id?: string | null
          intervalo_fim?: string | null
          intervalo_inicio?: string | null
          local?: string
          observacao?: string | null
          origem?: string
          programadora_id?: string | null
          quantidade?: number
          responsavel?: string
          situacao?: string
          status?: string
          tenant_id?: string
          transporte_detalhes?: string | null
          transporte_tipo?: string | null
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
          {
            foreignKeyName: "vagas_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acesso_tenant: { Args: { _tenant: string }; Returns: boolean }
      acesso_tenant_conversa: { Args: { _conversa: string }; Returns: boolean }
      admin_conversa: {
        Args: { _conversa: string; _user: string }
        Returns: boolean
      }
      arquivar_erros_resolvidos: { Args: { _id?: string }; Returns: number }
      cpf_colaborador_diaria: { Args: { _id: string }; Returns: string }
      criador_conversa: {
        Args: { _conversa: string; _user: string }
        Returns: boolean
      }
      definir_slug_tenant: {
        Args: { _slug: string; _tenant: string }
        Returns: string
      }
      definir_status_erro_sistema: {
        Args: { _id: string; _resolvido: boolean }
        Returns: undefined
      }
      definir_status_tenant: {
        Args: { _ativo: boolean; _tenant: string }
        Returns: undefined
      }
      dependencias_tenant: {
        Args: { _tenant: string }
        Returns: {
          bloqueia: boolean
          entidade: string
          total: number
        }[]
      }
      eh_master: { Args: { _user_id: string }; Returns: boolean }
      eh_super_admin: { Args: { _user_id: string }; Returns: boolean }
      excluir_tenant: {
        Args: { _confirmacao: string; _tenant: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      levantamento_diario_vagas_do_dia: {
        Args: { _data: string; _tenant: string }
        Returns: {
          colaborador: string
          data: string
          id: string
          programadora_id: string | null
          quantidade: number
          status: string
        }[]
      }
      minhas_permissoes: {
        Args: never
        Returns: {
          acao: string
          modulo: string
          permitido: boolean
        }[]
      }
      participa_conversa: {
        Args: { _conversa: string; _user: string }
        Returns: boolean
      }
      perfil_do_usuario: { Args: { _user_id: string }; Returns: string }
      pode_operar: { Args: { _user_id: string }; Returns: boolean }
      programadoras_da_programacao: {
        Args: never
        Returns: {
          id: string
          nome: string
        }[]
      }
      programadoras_habilitadas_do_tenant: {
        Args: { _tenant: string }
        Returns: {
          id: string
          nome: string
        }[]
      }
      provisionar_tenant: {
        Args: { _nome: string; _slug: string }
        Returns: string
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
      registrar_falha_pin: {
        Args: never
        Returns: {
          falhas: number
        }[]
      }
      registrar_log_tenant: {
        Args: { _acao: string; _detalhe: string; _tenant: string }
        Returns: undefined
      }
      renomear_tenant: {
        Args: { _nome: string; _tenant: string }
        Returns: undefined
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
      slug_publico: { Args: { _texto: string }; Returns: string }
      somente_dashboard: { Args: { _user_id: string }; Returns: boolean }
      tem_permissao: {
        Args: { _acao: string; _modulo: string; _user_id: string }
        Returns: boolean
      }
      tenant_ativo: { Args: never; Returns: string }
      tenant_ativo_para_captacao: {
        Args: { _tenant: string }
        Returns: boolean
      }
      tenant_atual: { Args: never; Returns: string }
      tenant_do_portal: { Args: never; Returns: string }
      tenant_do_usuario: { Args: { _user_id: string }; Returns: string }
      tenant_padrao: { Args: never; Returns: string }
      tenant_publico: {
        Args: { _slug: string }
        Returns: {
          id: string
          nome: string
          slug: string
        }[]
      }
      usuarios_com_permissao: {
        Args: { _acao: string; _modulo: string; _tenant: string }
        Returns: { user_id: string }[]
      }
      verificar_bloqueio: {
        Args: { _cpf: string; _empresa_id?: string }
        Returns: {
          bloqueado: boolean
          bloqueado_por_nome: string
          created_at: string
          empresa_id: string
          empresa_nome: string
          motivo: string
          tipo_bloqueio: string
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
        | "rs"
        | "coordenador_rs"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
        "rs",
        "coordenador_rs",
      ],
    },
  },
} as const
