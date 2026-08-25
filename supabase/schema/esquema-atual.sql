-- SNAPSHOT DO BANCO (schema public) — gerado em 2026-08-25T23:18:32Z
-- Documento de referência. A fonte oficial continua sendo supabase/migrations/*.sql

-- ================= TABELAS E COLUNAS =================

-- ================= POLÍTICAS RLS =================
-- alertas_operacao | alertas_operacao_delete | DELETE | roles=authenticated | using=has_role(auth.uid(), 'admin'::app_role) | check=-
-- alertas_operacao | alertas_operacao_insert | INSERT | roles=authenticated | using=- | check=pode_operar(auth.uid())
-- alertas_operacao | alertas_operacao_isolamento_tenant | ALL | roles=public | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- alertas_operacao | alertas_operacao_select | SELECT | roles=authenticated | using=pode_operar(auth.uid()) | check=-
-- alertas_operacao | alertas_operacao_update | UPDATE | roles=authenticated | using=pode_operar(auth.uid()) | check=pode_operar(auth.uid())
-- auditoria | auditoria_delete | DELETE | roles=authenticated | using=has_role(auth.uid(), 'admin'::app_role) | check=-
-- auditoria | auditoria_insert | INSERT | roles=authenticated | using=- | check=pode_operar(auth.uid())
-- auditoria | auditoria_isolamento_tenant | ALL | roles=public | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- auditoria | auditoria_select | SELECT | roles=authenticated | using=has_role(auth.uid(), 'admin'::app_role) | check=-
-- backup_agendamento | backup_agendamento_admin_insert | INSERT | roles=authenticated | using=- | check=has_role(auth.uid(), 'admin'::app_role)
-- backup_agendamento | backup_agendamento_admin_select | SELECT | roles=authenticated | using=has_role(auth.uid(), 'admin'::app_role) | check=-
-- backup_agendamento | backup_agendamento_admin_update | UPDATE | roles=authenticated | using=has_role(auth.uid(), 'admin'::app_role) | check=has_role(auth.uid(), 'admin'::app_role)
-- backup_agendamento | backup_agendamento_isolamento_tenant | ALL | roles=public | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- backups | backups_admin_delete | DELETE | roles=authenticated | using=has_role(auth.uid(), 'admin'::app_role) | check=-
-- backups | backups_admin_insert | INSERT | roles=authenticated | using=- | check=has_role(auth.uid(), 'admin'::app_role)
-- backups | backups_admin_select | SELECT | roles=authenticated | using=has_role(auth.uid(), 'admin'::app_role) | check=-
-- backups | backups_admin_update | UPDATE | roles=authenticated | using=has_role(auth.uid(), 'admin'::app_role) | check=has_role(auth.uid(), 'admin'::app_role)
-- backups | backups_isolamento_tenant | ALL | roles=public | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- candidatos | candidatos_delete | DELETE | roles=authenticated | using=has_role(auth.uid(), 'admin'::app_role) | check=-
-- candidatos | candidatos_insert | INSERT | roles=authenticated | using=- | check=(pode_operar(auth.uid()) AND (criado_por = auth.uid()))
-- candidatos | candidatos_isolamento_tenant | ALL | roles=public | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- candidatos | candidatos_select | SELECT | roles=authenticated | using=pode_operar(auth.uid()) | check=-
-- candidatos | candidatos_update | UPDATE | roles=authenticated | using=pode_operar(auth.uid()) | check=pode_operar(auth.uid())
-- colaboradores | colaboradores_isolamento_tenant | ALL | roles=public | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- colaboradores | colaboradores_select | SELECT | roles=authenticated | using=(tem_permissao(auth.uid(), 'equipe'::text, 'visualizar'::text) OR tem_permissao(auth.uid(), 'programacao'::text, 'visualizar'::text) OR tem_permissao(auth.uid(), 'programadoras'::text, 'visualizar'::text) OR tem_permissao(auth.uid(), 'vagas'::text, 'visualizar'::text)) | check=-
-- colaboradores | colaboradores_write | ALL | roles=authenticated | using=pode_operar(auth.uid()) | check=pode_operar(auth.uid())
-- colaboradores_bloqueados | bloqueios_delete | DELETE | roles=authenticated | using=tem_permissao(auth.uid(), 'bloqueios'::text, 'excluir'::text) | check=-
-- colaboradores_bloqueados | bloqueios_insert | INSERT | roles=authenticated | using=- | check=tem_permissao(auth.uid(), 'bloqueios'::text, 'criar'::text)
-- colaboradores_bloqueados | bloqueios_select | SELECT | roles=authenticated | using=tem_permissao(auth.uid(), 'bloqueios'::text, 'visualizar'::text) | check=-
-- colaboradores_bloqueados | bloqueios_update | UPDATE | roles=authenticated | using=tem_permissao(auth.uid(), 'bloqueios'::text, 'editar'::text) | check=tem_permissao(auth.uid(), 'bloqueios'::text, 'editar'::text)
-- colaboradores_bloqueados | colaboradores_bloqueados_isolamento_tenant | ALL | roles=public | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- configuracoes | configuracoes_isolamento_tenant | ALL | roles=public | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- configuracoes | configuracoes_select | SELECT | roles=authenticated | using=((chave = ANY (ARRAY['metas'::text, 'mapeamento_status'::text, 'meta_presencas'::text, 'inatividade_horas'::text, 'expediente_inicio'::text, 'expediente_fim'::text])) OR has_role(auth.uid(), 'admin'::app_role) OR tem_permissao(auth.uid(), 'configuracoes'::text, 'visualizar'::text)) | check=-
-- configuracoes | configuracoes_write | ALL | roles=authenticated | using=has_role(auth.uid(), 'admin'::app_role) | check=has_role(auth.uid(), 'admin'::app_role)
-- conversa_participantes | adicionar participantes | INSERT | roles=authenticated | using=- | check=(criador_conversa(conversa_id, auth.uid()) OR admin_conversa(conversa_id, auth.uid()))
-- conversa_participantes | atualizar minha participacao | UPDATE | roles=authenticated | using=((user_id = auth.uid()) OR admin_conversa(conversa_id, auth.uid())) | check=((user_id = auth.uid()) OR admin_conversa(conversa_id, auth.uid()))
-- conversa_participantes | conversa_participantes_isolamento_tenant | ALL | roles=public | using=acesso_tenant_conversa(conversa_id) | check=acesso_tenant_conversa(conversa_id)
-- conversa_participantes | sair ou remover participante | DELETE | roles=authenticated | using=((user_id = auth.uid()) OR admin_conversa(conversa_id, auth.uid())) | check=-
-- conversa_participantes | ver participantes das minhas conversas | SELECT | roles=authenticated | using=((user_id = auth.uid()) OR participa_conversa(conversa_id, auth.uid())) | check=-
-- conversas | admin apaga conversa | DELETE | roles=authenticated | using=(admin_conversa(id, auth.uid()) OR (criado_por = auth.uid())) | check=-
-- conversas | admin edita conversa | UPDATE | roles=authenticated | using=admin_conversa(id, auth.uid()) | check=admin_conversa(id, auth.uid())
-- conversas | conversas_isolamento_tenant | ALL | roles=public | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- conversas | criar conversas | INSERT | roles=authenticated | using=- | check=(criado_por = auth.uid())
-- conversas | ver conversas que participo | SELECT | roles=authenticated | using=(participa_conversa(id, auth.uid()) OR (criado_por = auth.uid())) | check=-
-- daily_workers | Autorizados cadastram | INSERT | roles=authenticated | using=- | check=tem_permissao(auth.uid(), 'banco_colaboradores'::text, 'criar'::text)
-- daily_workers | Autorizados editam | UPDATE | roles=authenticated | using=tem_permissao(auth.uid(), 'banco_colaboradores'::text, 'editar'::text) | check=tem_permissao(auth.uid(), 'banco_colaboradores'::text, 'editar'::text)
-- daily_workers | Autorizados excluem | DELETE | roles=authenticated | using=tem_permissao(auth.uid(), 'banco_colaboradores'::text, 'excluir'::text) | check=-
-- daily_workers | Autorizados leem banco de colaboradores | SELECT | roles=authenticated | using=tem_permissao(auth.uid(), 'banco_colaboradores'::text, 'visualizar'::text) | check=-
-- daily_workers | Portal publico apenas cadastra | INSERT | roles=anon | using=- | check=(consent_accepted AND (status = 'novo'::text) AND (tenant_id IS NOT NULL))
-- daily_workers | daily_workers_isolamento_tenant | ALL | roles=authenticated | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- empresas | empresas_isolamento_tenant | ALL | roles=public | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- empresas | empresas_select | SELECT | roles=authenticated | using=(tem_permissao(auth.uid(), 'empresas'::text, 'visualizar'::text) OR tem_permissao(auth.uid(), 'programacao'::text, 'visualizar'::text) OR tem_permissao(auth.uid(), 'programadoras'::text, 'visualizar'::text) OR tem_permissao(auth.uid(), 'vagas'::text, 'visualizar'::text) OR tem_permissao(auth.uid(), 'dashboard'::text, 'visualizar'::text)) | check=-
-- empresas | empresas_write | ALL | roles=authenticated | using=has_role(auth.uid(), 'admin'::app_role) | check=has_role(auth.uid(), 'admin'::app_role)
-- erros_sistema | erros_sistema_admin_delete | DELETE | roles=authenticated | using=has_role(auth.uid(), 'admin'::app_role) | check=-
-- erros_sistema | erros_sistema_admin_select | SELECT | roles=authenticated | using=has_role(auth.uid(), 'admin'::app_role) | check=-
-- erros_sistema | erros_sistema_admin_update | UPDATE | roles=authenticated | using=has_role(auth.uid(), 'admin'::app_role) | check=has_role(auth.uid(), 'admin'::app_role)
-- erros_sistema | erros_sistema_insert_authenticated | INSERT | roles=authenticated | using=- | check=(user_id = auth.uid())
-- erros_sistema | erros_sistema_isolamento_tenant | ALL | roles=authenticated | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- erros_sistema | erros_sistema_owner_update | UPDATE | roles=authenticated | using=(user_id = auth.uid()) | check=(user_id = auth.uid())
-- feedback_config | feedback_config_delete | DELETE | roles=authenticated | using=tem_permissao(auth.uid(), 'feedback'::text, 'administrar'::text) | check=-
-- feedback_config | feedback_config_insert | INSERT | roles=authenticated | using=- | check=tem_permissao(auth.uid(), 'feedback'::text, 'editar'::text)
-- feedback_config | feedback_config_isolamento_tenant | ALL | roles=authenticated | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- feedback_config | feedback_config_select | SELECT | roles=authenticated | using=tem_permissao(auth.uid(), 'feedback'::text, 'visualizar'::text) | check=-
-- feedback_config | feedback_config_update | UPDATE | roles=authenticated | using=tem_permissao(auth.uid(), 'feedback'::text, 'editar'::text) | check=tem_permissao(auth.uid(), 'feedback'::text, 'editar'::text)
-- feedback_respostas | feedback_respostas_isolamento_tenant | ALL | roles=authenticated | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- feedback_respostas | feedback_respostas_select | SELECT | roles=authenticated | using=tem_permissao(auth.uid(), 'feedback_respostas'::text, 'visualizar'::text) | check=-
-- feedbacks | feedbacks_delete | DELETE | roles=authenticated | using=tem_permissao(auth.uid(), 'feedback'::text, 'administrar'::text) | check=-
-- feedbacks | feedbacks_insert | INSERT | roles=authenticated | using=- | check=tem_permissao(auth.uid(), 'feedback'::text, 'criar'::text)
-- feedbacks | feedbacks_isolamento_tenant | ALL | roles=authenticated | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- feedbacks | feedbacks_select | SELECT | roles=authenticated | using=tem_permissao(auth.uid(), 'feedback'::text, 'visualizar'::text) | check=-
-- feedbacks | feedbacks_update | UPDATE | roles=authenticated | using=tem_permissao(auth.uid(), 'feedback'::text, 'criar'::text) | check=tem_permissao(auth.uid(), 'feedback'::text, 'criar'::text)
-- funcoes | funcoes_isolamento_tenant | ALL | roles=authenticated | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- funcoes | funcoes_select | SELECT | roles=authenticated | using=pode_operar(auth.uid()) | check=-
-- funcoes | funcoes_write | ALL | roles=authenticated | using=(tem_permissao(auth.uid(), 'administracao'::text, 'administrar'::text) OR tem_permissao(auth.uid(), 'configuracoes'::text, 'editar'::text) OR tem_permissao(auth.uid(), 'equipe'::text, 'editar'::text)) | check=(tem_permissao(auth.uid(), 'administracao'::text, 'administrar'::text) OR tem_permissao(auth.uid(), 'configuracoes'::text, 'editar'::text) OR tem_permissao(auth.uid(), 'equipe'::text, 'editar'::text))
-- importacoes | importacoes_all | ALL | roles=authenticated | using=pode_operar(auth.uid()) | check=pode_operar(auth.uid())
-- importacoes | importacoes_isolamento_tenant | ALL | roles=public | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- mensagens | apagar propria mensagem | DELETE | roles=authenticated | using=((autor_id = auth.uid()) OR admin_conversa(conversa_id, auth.uid())) | check=-
-- mensagens | editar propria mensagem | UPDATE | roles=authenticated | using=((autor_id = auth.uid()) OR admin_conversa(conversa_id, auth.uid())) | check=((autor_id = auth.uid()) OR admin_conversa(conversa_id, auth.uid()))
-- mensagens | enviar mensagens | INSERT | roles=authenticated | using=- | check=((autor_id = auth.uid()) AND participa_conversa(conversa_id, auth.uid()))
-- mensagens | mensagens_isolamento_tenant | ALL | roles=public | using=acesso_tenant_conversa(conversa_id) | check=acesso_tenant_conversa(conversa_id)
-- mensagens | ver mensagens das minhas conversas | SELECT | roles=authenticated | using=participa_conversa(conversa_id, auth.uid()) | check=-
-- notificacoes | notificacoes_delete | DELETE | roles=authenticated | using=((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)) | check=-
-- notificacoes | notificacoes_insert | INSERT | roles=authenticated | using=- | check=(user_id = auth.uid())
-- notificacoes | notificacoes_isolamento_tenant | ALL | roles=public | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- notificacoes | notificacoes_select | SELECT | roles=authenticated | using=(((user_id = auth.uid()) AND (para_admin = false)) OR (para_admin AND has_role(auth.uid(), 'admin'::app_role))) | check=-
-- notificacoes | notificacoes_update | UPDATE | roles=authenticated | using=(((user_id = auth.uid()) AND (para_admin = false)) OR (para_admin AND has_role(auth.uid(), 'admin'::app_role))) | check=((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
-- pagamentos | pagamentos_delete | DELETE | roles=authenticated | using=tem_permissao(auth.uid(), 'pagamentos'::text, 'excluir'::text) | check=-
-- pagamentos | pagamentos_insert | INSERT | roles=authenticated | using=- | check=tem_permissao(auth.uid(), 'pagamentos'::text, 'editar'::text)
-- pagamentos | pagamentos_isolamento_tenant | ALL | roles=authenticated | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- pagamentos | pagamentos_select | SELECT | roles=authenticated | using=tem_permissao(auth.uid(), 'pagamentos'::text, 'visualizar'::text) | check=-
-- pagamentos | pagamentos_update | UPDATE | roles=authenticated | using=tem_permissao(auth.uid(), 'pagamentos'::text, 'editar'::text) | check=tem_permissao(auth.uid(), 'pagamentos'::text, 'editar'::text)
-- perfil_permissoes | Administradores leem permissoes de perfil | SELECT | roles=authenticated | using=(tem_permissao(auth.uid(), 'perfis'::text, 'visualizar'::text) OR tem_permissao(auth.uid(), 'administracao'::text, 'administrar'::text)) | check=-
-- perfil_permissoes | Master administra permissoes de perfil | ALL | roles=authenticated | using=eh_master(auth.uid()) | check=eh_master(auth.uid())
-- perfil_permissoes | perfil_permissoes_isolamento_tenant | ALL | roles=public | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- perfis_acesso | Administradores leem perfis | SELECT | roles=authenticated | using=(tem_permissao(auth.uid(), 'perfis'::text, 'visualizar'::text) OR tem_permissao(auth.uid(), 'administracao'::text, 'administrar'::text)) | check=-
-- perfis_acesso | Master administra perfis | ALL | roles=authenticated | using=eh_master(auth.uid()) | check=eh_master(auth.uid())
-- perfis_acesso | perfis_acesso_isolamento_tenant | ALL | roles=public | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- permissoes_usuario | Master administra excecoes | ALL | roles=authenticated | using=eh_master(auth.uid()) | check=eh_master(auth.uid())
-- permissoes_usuario | Usuario le suas excecoes | SELECT | roles=authenticated | using=((user_id = auth.uid()) OR eh_master(auth.uid())) | check=-
-- permissoes_usuario | permissoes_usuario_isolamento_tenant | ALL | roles=public | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- planos | planos_admin | ALL | roles=authenticated | using=eh_super_admin(auth.uid()) | check=eh_super_admin(auth.uid())
-- planos | planos_select | SELECT | roles=authenticated | using=true | check=-
-- presenca_usuarios | atualizar minha presenca | UPDATE | roles=authenticated | using=(user_id = auth.uid()) | check=(user_id = auth.uid())
-- presenca_usuarios | gravar minha presenca | INSERT | roles=authenticated | using=- | check=(user_id = auth.uid())
-- presenca_usuarios | presenca_usuarios_isolamento_tenant | ALL | roles=authenticated | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- presenca_usuarios | ver presenca | SELECT | roles=authenticated | using=pode_operar(auth.uid()) | check=-
-- profiles | profiles_insert_self | INSERT | roles=authenticated | using=- | check=(id = auth.uid())
-- profiles | profiles_isolamento_tenant | ALL | roles=public | using=(acesso_tenant(tenant_id) OR (id = auth.uid())) | check=(acesso_tenant(tenant_id) OR (id = auth.uid()))
-- profiles | profiles_select | SELECT | roles=authenticated | using=((id = auth.uid()) OR eh_super_admin(auth.uid()) OR (NOT (tenant_id IS DISTINCT FROM tenant_do_usuario(auth.uid())))) | check=-
-- profiles | profiles_update_self | UPDATE | roles=authenticated | using=((id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)) | check=((id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
-- quinzenas_historico | quinzenas_historico_isolamento_tenant | ALL | roles=public | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- quinzenas_historico | quinzenas_select | SELECT | roles=authenticated | using=pode_operar(auth.uid()) | check=-
-- quinzenas_historico | quinzenas_write | ALL | roles=authenticated | using=has_role(auth.uid(), 'admin'::app_role) | check=has_role(auth.uid(), 'admin'::app_role)
-- reacoes_mensagem | alterar propria reacao | UPDATE | roles=authenticated | using=(user_id = auth.uid()) | check=(user_id = auth.uid())
-- reacoes_mensagem | reacoes visiveis a participantes | SELECT | roles=authenticated | using=participa_conversa(conversa_id, auth.uid()) | check=-
-- reacoes_mensagem | reacoes_isolamento_tenant | ALL | roles=public | using=acesso_tenant_conversa(conversa_id) | check=acesso_tenant_conversa(conversa_id)
-- reacoes_mensagem | reagir na propria conversa | INSERT | roles=authenticated | using=- | check=((user_id = auth.uid()) AND participa_conversa(conversa_id, auth.uid()))
-- reacoes_mensagem | remover propria reacao | DELETE | roles=authenticated | using=(user_id = auth.uid()) | check=-
-- rs_candidatos | rs_candidatos_delete | DELETE | roles=authenticated | using=tem_permissao(auth.uid(), 'rs_candidatos'::text, 'excluir'::text) | check=-
-- rs_candidatos | rs_candidatos_insert | INSERT | roles=authenticated | using=- | check=tem_permissao(auth.uid(), 'rs_candidatos'::text, 'criar'::text)
-- rs_candidatos | rs_candidatos_isolamento_tenant | ALL | roles=public | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- rs_candidatos | rs_candidatos_select | SELECT | roles=authenticated | using=tem_permissao(auth.uid(), 'rs_candidatos'::text, 'visualizar'::text) | check=-
-- rs_candidatos | rs_candidatos_update | UPDATE | roles=authenticated | using=tem_permissao(auth.uid(), 'rs_candidatos'::text, 'editar'::text) | check=tem_permissao(auth.uid(), 'rs_candidatos'::text, 'editar'::text)
-- rs_cargos | rs_cargos_delete | DELETE | roles=authenticated | using=tem_permissao(auth.uid(), 'rs_empresas'::text, 'excluir'::text) | check=-
-- rs_cargos | rs_cargos_insert | INSERT | roles=authenticated | using=- | check=tem_permissao(auth.uid(), 'rs_empresas'::text, 'criar'::text)
-- rs_cargos | rs_cargos_isolamento_tenant | ALL | roles=public | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- rs_cargos | rs_cargos_select | SELECT | roles=authenticated | using=tem_permissao(auth.uid(), 'rs_empresas'::text, 'visualizar'::text) | check=-
-- rs_cargos | rs_cargos_update | UPDATE | roles=authenticated | using=tem_permissao(auth.uid(), 'rs_empresas'::text, 'editar'::text) | check=tem_permissao(auth.uid(), 'rs_empresas'::text, 'editar'::text)
-- rs_empresas | rs_empresas_delete | DELETE | roles=authenticated | using=tem_permissao(auth.uid(), 'rs_empresas'::text, 'excluir'::text) | check=-
-- rs_empresas | rs_empresas_insert | INSERT | roles=authenticated | using=- | check=tem_permissao(auth.uid(), 'rs_empresas'::text, 'criar'::text)
-- rs_empresas | rs_empresas_isolamento_tenant | ALL | roles=public | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- rs_empresas | rs_empresas_select | SELECT | roles=authenticated | using=tem_permissao(auth.uid(), 'rs_empresas'::text, 'visualizar'::text) | check=-
-- rs_empresas | rs_empresas_update | UPDATE | roles=authenticated | using=tem_permissao(auth.uid(), 'rs_empresas'::text, 'editar'::text) | check=tem_permissao(auth.uid(), 'rs_empresas'::text, 'editar'::text)
-- rs_historico | rs_historico_insert | INSERT | roles=authenticated | using=- | check=tem_permissao(auth.uid(), 'rs_candidatos'::text, 'criar'::text)
-- rs_historico | rs_historico_isolamento_tenant | ALL | roles=public | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- rs_historico | rs_historico_select | SELECT | roles=authenticated | using=tem_permissao(auth.uid(), 'rs_candidatos'::text, 'visualizar'::text) | check=-
-- tenant_contexto | tenant_contexto_escrita | ALL | roles=authenticated | using=((user_id = auth.uid()) AND eh_super_admin(auth.uid())) | check=((user_id = auth.uid()) AND eh_super_admin(auth.uid()))
-- tenant_contexto | tenant_contexto_select | SELECT | roles=authenticated | using=(user_id = auth.uid()) | check=-
-- tenants | tenants_admin | ALL | roles=authenticated | using=eh_super_admin(auth.uid()) | check=eh_super_admin(auth.uid())
-- tenants | tenants_select | SELECT | roles=authenticated | using=((id = tenant_atual()) OR eh_super_admin(auth.uid())) | check=-
-- tenants_log | tenants_log_select_super_admin | SELECT | roles=authenticated | using=eh_super_admin(auth.uid()) | check=-
-- user_access_logs | acessos_delete_admin | DELETE | roles=authenticated | using=has_role(auth.uid(), 'admin'::app_role) | check=-
-- user_access_logs | acessos_insert_proprio | INSERT | roles=authenticated | using=- | check=(user_id = auth.uid())
-- user_access_logs | acessos_select_admin | SELECT | roles=authenticated | using=has_role(auth.uid(), 'admin'::app_role) | check=-
-- user_access_logs | acessos_select_proprio | SELECT | roles=authenticated | using=(user_id = auth.uid()) | check=-
-- user_access_logs | user_access_logs_isolamento_tenant | ALL | roles=authenticated | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- user_roles | user_roles_select_self | SELECT | roles=authenticated | using=((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)) | check=-
-- vagas | vagas_delete | DELETE | roles=authenticated | using=(pode_operar(auth.uid()) AND ((programadora_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))) | check=-
-- vagas | vagas_insert | INSERT | roles=authenticated | using=- | check=(pode_operar(auth.uid()) AND ((programadora_id = auth.uid()) OR (programadora_id IS NULL)))
-- vagas | vagas_isolamento_tenant | ALL | roles=public | using=acesso_tenant(tenant_id) | check=acesso_tenant(tenant_id)
-- vagas | vagas_select | SELECT | roles=authenticated | using=(tem_permissao(auth.uid(), 'vagas'::text, 'visualizar'::text) OR tem_permissao(auth.uid(), 'programacao'::text, 'visualizar'::text) OR tem_permissao(auth.uid(), 'programadoras'::text, 'visualizar'::text) OR tem_permissao(auth.uid(), 'dashboard'::text, 'visualizar'::text) OR tem_permissao(auth.uid(), 'confirmacoes'::text, 'visualizar'::text) OR tem_permissao(auth.uid(), 'performance'::text, 'visualizar'::text) OR tem_permissao(auth.uid(), 'analise'::text, 'visualizar'::text) OR tem_permissao(auth.uid(), 'radar'::text, 'visualizar'::text) OR tem_permissao(auth.uid(), 'comparar'::text, 'visualizar'::text) OR tem_permissao(auth.uid(), 'relatorios'::text, 'visualizar'::text)) | check=-
-- vagas | vagas_update | UPDATE | roles=authenticated | using=(pode_operar(auth.uid()) AND ((programadora_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))) | check=pode_operar(auth.uid())

-- ================= FUNÇÕES =================
CREATE OR REPLACE FUNCTION public.acesso_tenant(_tenant uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT _tenant IS NOT NULL
     AND _tenant = public.tenant_ativo()
     AND (
       public.eh_super_admin(auth.uid())
       OR EXISTS (SELECT 1 FROM public.tenants t
                   WHERE t.id = _tenant AND t.ativo AND t.status = 'ativo')
     )
$function$
;

CREATE OR REPLACE FUNCTION public.acesso_tenant_conversa(_conversa uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.acesso_tenant((SELECT c.tenant_id FROM public.conversas c WHERE c.id = _conversa))
$function$
;

CREATE OR REPLACE FUNCTION public.admin_conversa(_conversa uuid, _user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.conversa_participantes p
                 WHERE p.conversa_id = _conversa AND p.user_id = _user AND p.admin)
$function$
;

CREATE OR REPLACE FUNCTION public.aplicar_tenant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _meu uuid := COALESCE(public.tenant_ativo(), public.tenant_padrao());
  _prov uuid;
BEGIN
  BEGIN
    _prov := NULLIF(current_setting('app.provisionando_tenant', true), '')::uuid;
  EXCEPTION WHEN others THEN _prov := NULL;
  END;
  IF _prov IS NOT NULL AND public.eh_super_admin(auth.uid()) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.tenant_id := COALESCE(NEW.tenant_id, _prov);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NULL THEN
      NEW.tenant_id := COALESCE(NEW.tenant_id, _meu);
    ELSE
      NEW.tenant_id := _meu;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'Acesso negado: não é permitido alterar a empresa do registro.' USING ERRCODE = '42501';
  END IF;

  -- O próprio perfil do usuário continua editável mesmo com outra empresa ativa.
  IF TG_TABLE_NAME = 'profiles' AND auth.uid() IS NOT NULL THEN
    IF to_jsonb(OLD)->>'id' = auth.uid()::text THEN
      RETURN NEW;
    END IF;
  END IF;

  IF auth.uid() IS NOT NULL AND OLD.tenant_id IS DISTINCT FROM _meu THEN
    RAISE EXCEPTION 'Acesso negado: registro pertence a outra empresa.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$function$
;

CREATE OR REPLACE FUNCTION public.arquivar_erros_resolvidos(_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _tenant uuid := public.tenant_atual();
  _total integer;
BEGIN
  IF _tenant IS NULL OR NOT public.acesso_tenant(_tenant) OR NOT public.eh_master(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.erros_sistema
  SET arquivado_em = now(), updated_at = now()
  WHERE tenant_id = _tenant
    AND status = 'resolvido'
    AND arquivado_em IS NULL
    AND (_id IS NULL OR id = _id);
  GET DIAGNOSTICS _total = ROW_COUNT;
  RETURN _total;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cpf_colaborador_diaria(_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN public.eh_master(auth.uid()) OR public.has_role(auth.uid(), 'admin')
      THEN (SELECT d.cpf FROM public.daily_workers d WHERE d.id = _id)
    ELSE NULL
  END
$function$
;

CREATE OR REPLACE FUNCTION public.criador_conversa(_conversa uuid, _user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.conversas c
                 WHERE c.id = _conversa AND c.criado_por = _user)
$function$
;

CREATE OR REPLACE FUNCTION public.definir_slug_tenant(_tenant uuid, _slug text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _limpo text;
  _antigo text;
BEGIN
  IF NOT public.eh_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas a CEO pode alterar o link público.' USING ERRCODE = '42501';
  END IF;
  _limpo := left(public.slug_publico(_slug), 60);
  IF length(_limpo) < 3 THEN
    RAISE EXCEPTION 'Informe um identificador com pelo menos 3 letras ou números.';
  END IF;
  SELECT slug INTO _antigo FROM public.tenants WHERE id = _tenant;
  IF _antigo IS NULL THEN
    RAISE EXCEPTION 'Empresa não encontrada.';
  END IF;
  IF _limpo = _antigo THEN
    RETURN _antigo;
  END IF;
  IF EXISTS (SELECT 1 FROM public.tenants WHERE slug = _limpo) THEN
    RAISE EXCEPTION 'Já existe uma empresa com este identificador.';
  END IF;
  UPDATE public.tenants SET slug = _limpo, updated_at = now() WHERE id = _tenant;
  PERFORM public.registrar_log_tenant(_tenant, 'renomear',
    'Link público alterado de ' || _antigo || ' para ' || _limpo);
  RETURN _limpo;
END $function$
;

CREATE OR REPLACE FUNCTION public.definir_status_erro_sistema(_id uuid, _resolvido boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _tenant uuid;
  _nome text;
BEGIN
  SELECT tenant_id INTO _tenant FROM public.erros_sistema WHERE id = _id;
  IF _tenant IS NULL OR NOT public.acesso_tenant(_tenant) OR NOT public.eh_master(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  SELECT nome INTO _nome FROM public.profiles WHERE id = auth.uid();
  UPDATE public.erros_sistema
  SET status = CASE WHEN _resolvido THEN 'resolvido' ELSE 'pendente' END,
      resolvido_por = CASE WHEN _resolvido THEN auth.uid() ELSE NULL END,
      resolvido_por_nome = CASE WHEN _resolvido THEN coalesce(_nome, '') ELSE '' END,
      resolvido_em = CASE WHEN _resolvido THEN now() ELSE NULL END,
      arquivado_em = NULL,
      updated_at = now()
  WHERE id = _id AND tenant_id = _tenant;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.definir_status_tenant(_tenant uuid, _ativo boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _t record;
BEGIN
  IF NOT public.eh_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas a CEO pode ativar ou inativar empresas.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO _t FROM public.tenants WHERE id = _tenant;
  IF NOT FOUND THEN RAISE EXCEPTION 'Empresa não encontrada.'; END IF;

  UPDATE public.tenants
     SET ativo = _ativo, status = CASE WHEN _ativo THEN 'ativo' ELSE 'inativo' END
   WHERE id = _tenant;

  PERFORM public.registrar_log_tenant(_tenant, CASE WHEN _ativo THEN 'ativar' ELSE 'inativar' END,
    CASE WHEN _ativo THEN 'Empresa reativada (dados preservados).' ELSE 'Empresa inativada (dados preservados).' END);

  INSERT INTO public.auditoria (tabela, registro_id, acao, descricao, campo, valor_anterior, valor_novo, usuario_id, usuario_nome, tenant_id)
  VALUES ('tenants', _tenant, CASE WHEN _ativo THEN 'ativar' ELSE 'inativar' END,
          'Empresa ' || _t.nome, 'status', _t.status, CASE WHEN _ativo THEN 'ativo' ELSE 'inativo' END,
          auth.uid(), COALESCE((SELECT nome FROM public.profiles WHERE id = auth.uid()), 'CEO'), _tenant);
END $function$
;

CREATE OR REPLACE FUNCTION public.dependencias_tenant(_tenant uuid)
 RETURNS TABLE(entidade text, total bigint, bloqueia boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT * FROM (
    SELECT 'Usuários'::text, (SELECT count(*) FROM public.profiles WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'Candidatos', (SELECT count(*) FROM public.candidatos WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'Vagas', (SELECT count(*) FROM public.vagas WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'Colaboradores', (SELECT count(*) FROM public.colaboradores WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'Empresas parceiras', (SELECT count(*) FROM public.empresas WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'Banco de diárias', (SELECT count(*) FROM public.daily_workers WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'Bloqueios', (SELECT count(*) FROM public.colaboradores_bloqueados WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'R&S — candidatos', (SELECT count(*) FROM public.rs_candidatos WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'R&S — empresas', (SELECT count(*) FROM public.rs_empresas WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'Importações', (SELECT count(*) FROM public.importacoes WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'Histórico de quinzenas', (SELECT count(*) FROM public.quinzenas_historico WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'Backups', (SELECT count(*) FROM public.backups WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'Conversas do chat', (SELECT count(*) FROM public.conversas WHERE tenant_id = _tenant), true
    UNION ALL SELECT 'Auditoria', (SELECT count(*) FROM public.auditoria WHERE tenant_id = _tenant), false
    UNION ALL SELECT 'Configurações', (SELECT count(*) FROM public.configuracoes WHERE tenant_id = _tenant), false
    UNION ALL SELECT 'Perfis de acesso', (SELECT count(*) FROM public.perfis_acesso WHERE tenant_id = _tenant), false
  ) d(entidade, total, bloqueia)
  WHERE public.eh_super_admin(auth.uid())
  ORDER BY 2 DESC, 1
$function$
;

CREATE OR REPLACE FUNCTION public.eh_master(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- master é sempre limitado ao próprio tenant; acesso global só via eh_super_admin()
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND master AND ativo)
$function$
;

CREATE OR REPLACE FUNCTION public.eh_super_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.super_admins s WHERE s.user_id = _user_id)
$function$
;

CREATE OR REPLACE FUNCTION public.excluir_tenant(_tenant uuid, _confirmacao text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _t record; _bloqueios text;
BEGIN
  IF NOT public.eh_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas a CEO pode excluir empresas.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO _t FROM public.tenants WHERE id = _tenant;
  IF NOT FOUND THEN RAISE EXCEPTION 'Empresa não encontrada.'; END IF;

  IF _t.ativo OR _t.status = 'ativo' THEN
    RAISE EXCEPTION 'Empresa ativa não pode ser excluída. Inative a empresa antes de excluir.' USING ERRCODE = '42501';
  END IF;

  IF lower(btrim(coalesce(_confirmacao,''))) <> lower(_t.nome) THEN
    RAISE EXCEPTION 'Digite exatamente o nome da empresa para confirmar a exclusão.';
  END IF;

  IF _tenant = public.tenant_ativo() THEN
    RAISE EXCEPTION 'Troque para outra empresa antes de excluir esta, que está ativa na sua sessão.';
  END IF;

  IF _t.slug = 'operacao-atual' THEN
    RAISE EXCEPTION 'A empresa principal do sistema não pode ser excluída. Use "Inativar empresa".';
  END IF;

  SELECT string_agg(format('%s (%s)', d.entidade, d.total), ', ')
    INTO _bloqueios
  FROM public.dependencias_tenant(_tenant) d
  WHERE d.bloqueia AND d.total > 0;

  IF _bloqueios IS NOT NULL THEN
    RAISE EXCEPTION 'Exclusão bloqueada: a empresa possui dados vinculados — %. Use "Inativar empresa" para preservar tudo.', _bloqueios;
  END IF;

  PERFORM public.registrar_log_tenant(_tenant, 'excluir', 'Empresa excluída (inativa e sem dados operacionais vinculados).');

  DELETE FROM public.tenant_contexto WHERE tenant_id = _tenant;
  DELETE FROM public.notificacoes WHERE tenant_id = _tenant;
  DELETE FROM public.alertas_operacao WHERE tenant_id = _tenant;
  DELETE FROM public.erros_sistema WHERE tenant_id = _tenant;
  DELETE FROM public.user_access_logs WHERE tenant_id = _tenant;
  DELETE FROM public.presenca_usuarios WHERE tenant_id = _tenant;
  DELETE FROM public.backup_agendamento WHERE tenant_id = _tenant;
  DELETE FROM public.permissoes_usuario WHERE tenant_id = _tenant;
  DELETE FROM public.perfil_permissoes WHERE tenant_id = _tenant;
  DELETE FROM public.perfis_acesso WHERE tenant_id = _tenant;
  DELETE FROM public.configuracoes WHERE tenant_id = _tenant;
  DELETE FROM public.auditoria WHERE tenant_id = _tenant;
  DELETE FROM public.tenants WHERE id = _tenant;
END $function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _tenant uuid;
BEGIN
  BEGIN
    _tenant := NULLIF(NEW.raw_user_meta_data->>'tenant_id','')::uuid;
  EXCEPTION WHEN others THEN _tenant := NULL;
  END;
  IF _tenant IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = _tenant) THEN
    _tenant := NULL;
  END IF;

  IF _tenant IS NULL THEN
    IF (SELECT count(*) FROM public.tenants) > 1 THEN
      RAISE EXCEPTION 'Cadastro sem empresa definida: use um convite válido.' USING ERRCODE = '42501';
    END IF;
    _tenant := public.tenant_padrao();
  END IF;

  INSERT INTO public.profiles (id, nome, email, tenant_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email, _tenant)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN (SELECT count(*) FROM public.user_roles WHERE role='admin') = 0 THEN 'admin'::public.app_role ELSE 'programadora'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $function$
;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$function$
;

CREATE OR REPLACE FUNCTION public.impedir_vaga_bloqueada()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _cpf text;
  _b record;
BEGIN
  IF NEW.candidato_id IS NULL THEN RETURN NEW; END IF;

  SELECT c.cpf INTO _cpf FROM public.candidatos c WHERE c.id = NEW.candidato_id;
  IF _cpf IS NULL THEN RETURN NEW; END IF;

  SELECT b.tipo_bloqueio, b.motivo INTO _b
  FROM public.colaboradores_bloqueados b
  WHERE b.ativo
    AND b.cpf = _cpf
    AND (b.tipo_bloqueio = 'TODAS_EMPRESAS'
         OR (NEW.empresa_id IS NOT NULL AND b.empresa_id = NEW.empresa_id))
  ORDER BY (b.tipo_bloqueio = 'TODAS_EMPRESAS') DESC
  LIMIT 1;

  IF FOUND THEN
    IF _b.tipo_bloqueio = 'TODAS_EMPRESAS' THEN
      RAISE EXCEPTION 'COLABORADOR BLOQUEADO: este colaborador está bloqueado para todas as empresas. Motivo: %', COALESCE(NULLIF(_b.motivo,''), 'não informado')
        USING ERRCODE = '42501';
    ELSE
      RAISE EXCEPTION 'COLABORADOR BLOQUEADO: este colaborador está bloqueado para esta empresa. Motivo: %', COALESCE(NULLIF(_b.motivo,''), 'não informado')
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.limpar_conversa_vazia()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.conversa_participantes WHERE conversa_id = OLD.conversa_id) THEN
    DELETE FROM public.conversas WHERE id = OLD.conversa_id;
  END IF;
  RETURN OLD;
END; $function$
;

CREATE OR REPLACE FUNCTION public.minhas_permissoes()
 RETURNS TABLE(modulo text, acao text, permitido boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT m.modulo, m.acao, public.tem_permissao(auth.uid(), m.modulo, m.acao)
  FROM (SELECT DISTINCT pp.modulo, pp.acao FROM public.perfil_permissoes pp) m
  WHERE auth.uid() IS NOT NULL
$function$
;

CREATE OR REPLACE FUNCTION public.notificar_novo_colaborador_diaria()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notificacoes (
    user_id, tipo, titulo, mensagem, para_admin, chave, tenant_id
  )
  VALUES (
    NULL,
    'banco-colaboradores',
    'Novo colaborador cadastrado',
    format('%s se cadastrou para oportunidades de diária.', NEW.full_name),
    true,
    format('diaria-%s', NEW.id),
    NEW.tenant_id
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END
$function$
;

CREATE OR REPLACE FUNCTION public.participa_conversa(_conversa uuid, _user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.conversa_participantes p
                 WHERE p.conversa_id = _conversa AND p.user_id = _user)
$function$
;

CREATE OR REPLACE FUNCTION public.perfil_do_usuario(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT p.perfil_id FROM public.profiles p WHERE p.id = _user_id),
    (SELECT pa.id FROM public.user_roles r
       JOIN public.perfis_acesso pa ON pa.chave = r.role::text
      WHERE r.user_id = _user_id
      ORDER BY (pa.chave = 'admin') DESC LIMIT 1)
  )
$function$
;

CREATE OR REPLACE FUNCTION public.pode_operar(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','programadora'))
      OR public.tem_permissao(_user_id, 'vagas', 'editar')
$function$
;

CREATE OR REPLACE FUNCTION public.programadoras_da_programacao()
 RETURNS TABLE(id uuid, nome text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.nome
  FROM public.profiles p
  WHERE p.tenant_id = public.tenant_atual()
    AND public.acesso_tenant(p.tenant_id)
    AND p.ativo = true
    AND public.tem_permissao(p.id, 'programacao', 'visualizar')
  ORDER BY p.nome;
$function$
;

CREATE OR REPLACE FUNCTION public.proteger_campos_privilegiados()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _autorizado boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  _autorizado := public.eh_master(auth.uid()) OR public.has_role(auth.uid(), 'admin');
  IF _autorizado THEN
    RETURN NEW;
  END IF;

  IF NEW.master IS DISTINCT FROM OLD.master THEN
    RAISE EXCEPTION 'Sem permissão para alterar o nível master.' USING ERRCODE = '42501';
  END IF;
  IF NEW.perfil_id IS DISTINCT FROM OLD.perfil_id THEN
    RAISE EXCEPTION 'Sem permissão para alterar o perfil de acesso.' USING ERRCODE = '42501';
  END IF;
  IF NEW.funcao_id IS DISTINCT FROM OLD.funcao_id THEN
    RAISE EXCEPTION 'Sem permissão para alterar a função da equipe.' USING ERRCODE = '42501';
  END IF;
  IF NEW.ativo IS DISTINCT FROM OLD.ativo THEN
    RAISE EXCEPTION 'Sem permissão para alterar o status de acesso.' USING ERRCODE = '42501';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Sem permissão para alterar o identificador.' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.proteger_ultimo_master()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (OLD.master AND (NOT NEW.master OR NEW.ativo = false)) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE master AND ativo AND id <> OLD.id
    ) THEN
      RAISE EXCEPTION 'É necessário manter pelo menos um administrador master ativo.';
    END IF;
  END IF;
  RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.provisionar_tenant(_nome text, _slug text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _novo uuid;
  _modelo uuid := public.tenant_padrao();
  _nome_limpo text := btrim(coalesce(_nome, ''));
  _slug_limpo text := btrim(lower(coalesce(_slug, '')));
  _base text;
  _n int := 1;
BEGIN
  IF NOT public.eh_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas a CEO pode criar empresas.' USING ERRCODE = '42501';
  END IF;
  IF _nome_limpo = '' THEN
    RAISE EXCEPTION 'Informe o nome da empresa.';
  END IF;
  _slug_limpo := public.slug_publico(COALESCE(NULLIF(_slug_limpo, ''), _nome_limpo));
  IF _slug_limpo = '' THEN
    RAISE EXCEPTION 'Informe um identificador válido para a empresa.';
  END IF;
  _base := left(_slug_limpo, 60);
  _slug_limpo := _base;
  WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = _slug_limpo) LOOP
    _n := _n + 1;
    _slug_limpo := _base || '-' || _n::text;
  END LOOP;

  INSERT INTO public.tenants (nome, slug) VALUES (_nome_limpo, _slug_limpo) RETURNING id INTO _novo;

  PERFORM set_config('app.provisionando_tenant', _novo::text, true);

  INSERT INTO public.perfis_acesso (tenant_id, chave, nome, descricao, sistema)
  SELECT _novo, p.chave, p.nome, p.descricao, p.sistema
  FROM public.perfis_acesso p WHERE p.tenant_id = _modelo;

  INSERT INTO public.perfil_permissoes (tenant_id, perfil_id, modulo, acao, permitido)
  SELECT _novo, novo_perfil.id, pp.modulo, pp.acao, pp.permitido
  FROM public.perfil_permissoes pp
  JOIN public.perfis_acesso modelo_perfil ON modelo_perfil.id = pp.perfil_id AND modelo_perfil.tenant_id = _modelo
  JOIN public.perfis_acesso novo_perfil ON novo_perfil.tenant_id = _novo AND novo_perfil.chave = modelo_perfil.chave
  WHERE pp.tenant_id = _modelo;

  INSERT INTO public.configuracoes (tenant_id, chave, valor)
  SELECT _novo, c.chave, c.valor FROM public.configuracoes c WHERE c.tenant_id = _modelo;

  INSERT INTO public.auditoria (tabela, registro_id, acao, descricao, campo, valor_anterior, valor_novo, usuario_id, usuario_nome, tenant_id)
  VALUES ('tenants', _novo, 'criar', 'Empresa criada: ' || _nome_limpo, 'nome', '', _nome_limpo, auth.uid(),
          COALESCE((SELECT nome FROM public.profiles WHERE id = auth.uid()), 'CEO'), _novo);

  PERFORM set_config('app.provisionando_tenant', '', true);
  RETURN _novo;
END $function$
;

CREATE OR REPLACE FUNCTION public.registrar_acesso(_navegador text DEFAULT ''::text, _sistema_operacional text DEFAULT ''::text, _user_agent text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _nome text;
  _id uuid;
  _ultimo timestamptz;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'nao autenticado';
  END IF;

  SELECT coalesce(p.nome, 'Usuário'), p.last_login_at INTO _nome, _ultimo
  FROM public.profiles p WHERE p.id = _uid;
  _nome := coalesce(_nome, 'Usuário');

  INSERT INTO public.user_access_logs (user_id, usuario_nome, navegador, sistema_operacional, user_agent)
  VALUES (_uid, left(_nome, 160), left(coalesce(_navegador,''), 160), left(coalesce(_sistema_operacional,''), 160), left(coalesce(_user_agent,''), 1000))
  RETURNING id INTO _id;

  UPDATE public.profiles
     SET last_login_at = now(), ultimo_acesso = now()
   WHERE id = _uid;

  -- Notifica administradores no máximo uma vez a cada 15 minutos por usuário
  IF _ultimo IS NULL OR _ultimo < now() - interval '15 minutes' THEN
    INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, para_admin, chave)
    VALUES (
      _uid, 'acesso', 'Novo acesso',
      format('Novo acesso: %s entrou no Recruta+ às %s.', _nome,
             to_char(timezone('America/Sao_Paulo', now()), 'HH24:MI')),
      true,
      format('acesso-%s-%s', _uid, to_char(timezone('America/Sao_Paulo', now()), 'YYYYMMDDHH24MI'))
    ) ON CONFLICT DO NOTHING;
  END IF;

  RETURN _id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.registrar_auditoria()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _nome text;
  _campos text[];
  _campo text;
  _antes text;
  _depois text;
  _rid uuid;
  _desc text;
  _antigo jsonb;
  _novo jsonb;
BEGIN
  SELECT coalesce(p.nome, 'Sistema') INTO _nome FROM public.profiles p WHERE p.id = auth.uid();
  _nome := coalesce(_nome, 'Sistema');

  IF TG_OP = 'DELETE' THEN
    _antigo := to_jsonb(OLD); _novo := '{}'::jsonb;
  ELSIF TG_OP = 'INSERT' THEN
    _antigo := '{}'::jsonb; _novo := to_jsonb(NEW);
  ELSE
    _antigo := to_jsonb(OLD); _novo := to_jsonb(NEW);
  END IF;

  _rid := (coalesce(_novo->>'id', _antigo->>'id'))::uuid;
  _desc := coalesce(_novo->>'nome', _antigo->>'nome', _novo->>'descricao', _antigo->>'descricao', '');

  IF TG_OP <> 'UPDATE' THEN
    INSERT INTO public.auditoria (tabela, registro_id, acao, descricao, campo, valor_anterior, valor_novo, usuario_id, usuario_nome)
    VALUES (TG_TABLE_NAME, _rid, TG_OP, left(_desc, 300), '', '', '', auth.uid(), _nome);
    RETURN COALESCE(NEW, OLD);
  END IF;

  _campos := ARRAY(SELECT jsonb_object_keys(_novo));
  FOREACH _campo IN ARRAY _campos LOOP
    IF _campo IN ('updated_at','created_at') THEN CONTINUE; END IF;
    _antes := _antigo->>_campo;
    _depois := _novo->>_campo;
    IF _antes IS DISTINCT FROM _depois THEN
      INSERT INTO public.auditoria (tabela, registro_id, acao, descricao, campo, valor_anterior, valor_novo, usuario_id, usuario_nome)
      VALUES (TG_TABLE_NAME, _rid, 'UPDATE', left(_desc, 300), _campo, left(coalesce(_antes,''), 500), left(coalesce(_depois,''), 500), auth.uid(), _nome);
    END IF;
  END LOOP;
  RETURN NEW;
END; $function$
;

CREATE OR REPLACE FUNCTION public.registrar_erro_sistema(_fingerprint text, _pagina text, _componente text, _operacao text, _endpoint text, _codigo_http integer, _categoria text, _mensagem text, _stack text, _navegador text, _sistema_operacional text, _user_agent text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _id uuid;
  _ocorrencias integer;
BEGIN
  INSERT INTO public.erros_sistema (
    fingerprint, user_id, pagina, componente, operacao, endpoint, codigo_http,
    categoria, mensagem, stack, navegador, sistema_operacional, user_agent
  ) VALUES (
    left(_fingerprint, 160), auth.uid(), left(coalesce(_pagina,''), 500),
    left(coalesce(_componente,''), 160), left(coalesce(_operacao,''), 160),
    left(coalesce(_endpoint,''), 500), _codigo_http,
    CASE WHEN _categoria IN ('frontend','autenticacao','banco','api') THEN _categoria ELSE 'frontend' END,
    left(coalesce(_mensagem,'Erro desconhecido'), 2000), left(coalesce(_stack,''), 8000),
    left(coalesce(_navegador,''), 160), left(coalesce(_sistema_operacional,''), 160),
    left(coalesce(_user_agent,''), 1000)
  )
  ON CONFLICT (tenant_id, fingerprint, user_id) DO UPDATE SET
    ocorrencias = public.erros_sistema.ocorrencias + 1,
    ultima_ocorrencia = now(),
    pagina = EXCLUDED.pagina,
    componente = EXCLUDED.componente,
    operacao = EXCLUDED.operacao,
    endpoint = EXCLUDED.endpoint,
    codigo_http = EXCLUDED.codigo_http,
    categoria = EXCLUDED.categoria,
    mensagem = EXCLUDED.mensagem,
    stack = EXCLUDED.stack,
    navegador = EXCLUDED.navegador,
    sistema_operacional = EXCLUDED.sistema_operacional,
    user_agent = EXCLUDED.user_agent,
    status = 'pendente',
    resolvido_por = NULL,
    resolvido_por_nome = '',
    resolvido_em = NULL,
    arquivado_em = NULL,
    updated_at = now()
  RETURNING id, ocorrencias INTO _id, _ocorrencias;

  IF _ocorrencias IN (5, 10, 25, 50, 100) THEN
    INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, para_admin, chave)
    VALUES (
      auth.uid(), 'saude-sistema', 'Aumento de erros no sistema',
      format('A falha em %s atingiu %s ocorrências: %s', coalesce(nullif(_componente,''), _pagina), _ocorrencias, left(_mensagem, 180)),
      true, format('saude-%s-%s', left(_fingerprint, 80), _ocorrencias)
    ) ON CONFLICT DO NOTHING;
  END IF;
  RETURN _id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.registrar_log_tenant(_tenant uuid, _acao text, _detalhe text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _t record; _nome text;
BEGIN
  SELECT t.nome, t.slug INTO _t FROM public.tenants t WHERE t.id = _tenant;
  SELECT COALESCE(p.nome, 'Sistema') INTO _nome FROM public.profiles p WHERE p.id = auth.uid();
  INSERT INTO public.tenants_log (tenant_id, tenant_nome, tenant_slug, acao, detalhe, usuario_id, usuario_nome)
  VALUES (_tenant, COALESCE(_t.nome,''), COALESCE(_t.slug,''), _acao, COALESCE(_detalhe,''), auth.uid(), COALESCE(_nome,'Sistema'));
END $function$
;

CREATE OR REPLACE FUNCTION public.registrar_troca_tenant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _nome text; _de text; _para text;
BEGIN
  SELECT COALESCE(p.nome, 'Sistema') INTO _nome FROM public.profiles p WHERE p.id = auth.uid();
  SELECT t.nome INTO _para FROM public.tenants t WHERE t.id = NEW.tenant_id;
  IF TG_OP = 'UPDATE' THEN
    SELECT t.nome INTO _de FROM public.tenants t WHERE t.id = OLD.tenant_id;
  END IF;
  INSERT INTO public.auditoria (tabela, registro_id, acao, descricao, campo, valor_anterior, valor_novo, usuario_id, usuario_nome, tenant_id)
  VALUES ('tenant_contexto', NEW.tenant_id, 'TROCA_EMPRESA', 'Troca de empresa ativa', 'tenant_id',
          COALESCE(_de, ''), COALESCE(_para, ''), auth.uid(), COALESCE(_nome, 'Sistema'), NEW.tenant_id);
  RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.renomear_tenant(_tenant uuid, _nome text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _antigo text; _limpo text := btrim(coalesce(_nome,''));
BEGIN
  IF NOT public.eh_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas a CEO pode editar empresas.' USING ERRCODE = '42501';
  END IF;
  IF length(_limpo) < 2 THEN RAISE EXCEPTION 'Informe o nome da empresa.'; END IF;
  SELECT nome INTO _antigo FROM public.tenants WHERE id = _tenant;
  IF _antigo IS NULL THEN RAISE EXCEPTION 'Empresa não encontrada.'; END IF;

  UPDATE public.tenants SET nome = _limpo WHERE id = _tenant;
  PERFORM public.registrar_log_tenant(_tenant, 'editar', format('Nome alterado de "%s" para "%s".', _antigo, _limpo));
  INSERT INTO public.auditoria (tabela, registro_id, acao, descricao, campo, valor_anterior, valor_novo, usuario_id, usuario_nome, tenant_id)
  VALUES ('tenants', _tenant, 'UPDATE', 'Empresa renomeada', 'nome', _antigo, _limpo,
          auth.uid(), COALESCE((SELECT nome FROM public.profiles WHERE id = auth.uid()), 'CEO'), _tenant);
END $function$
;

CREATE OR REPLACE FUNCTION public.resumo_saude_sistema()
 RETURNS TABLE(categoria text, codigo_http integer, componente text, endpoint text, ocorrencias bigint, ultima_ocorrencia timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT e.categoria, e.codigo_http, e.componente, e.endpoint,
         sum(e.ocorrencias)::bigint, max(e.ultima_ocorrencia)
  FROM public.erros_sistema e
  WHERE public.has_role(auth.uid(), 'admin')
  GROUP BY e.categoria, e.codigo_http, e.componente, e.endpoint
  ORDER BY sum(e.ocorrencias) DESC, max(e.ultima_ocorrencia) DESC;
$function$
;

CREATE OR REPLACE FUNCTION public.rs_registrar_historico()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _nome text;
  _campo text;
  _antes text;
  _depois text;
  _antigo jsonb;
  _novo jsonb;
BEGIN
  SELECT coalesce(p.nome, 'Sistema') INTO _nome FROM public.profiles p WHERE p.id = auth.uid();
  _nome := coalesce(_nome, 'Sistema');

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.rs_historico (candidato_id, acao, campo, valor_novo, usuario_id, usuario_nome)
    VALUES (NEW.id, 'cadastro', '', left(NEW.nome, 300), auth.uid(), _nome);
    RETURN NEW;
  END IF;

  _antigo := to_jsonb(OLD); _novo := to_jsonb(NEW);
  FOREACH _campo IN ARRAY ARRAY['nome','cpf','telefone','empresa_id','cargo','data_admissao','status','data_desligamento','motivo_desligamento','recrutador_nome','observacao'] LOOP
    _antes := _antigo->>_campo;
    _depois := _novo->>_campo;
    IF _antes IS DISTINCT FROM _depois THEN
      INSERT INTO public.rs_historico (candidato_id, acao, campo, valor_anterior, valor_novo, usuario_id, usuario_nome)
      VALUES (NEW.id,
        CASE WHEN _campo = 'status' AND _depois = 'desligado' THEN 'desligamento'
             WHEN _campo = 'data_admissao' THEN 'admissao'
             ELSE 'alteracao' END,
        _campo, left(coalesce(_antes,''), 500), left(coalesce(_depois,''), 500), auth.uid(), _nome);
    END IF;
  END LOOP;
  RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.rs_validar_candidato()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'desligado' AND NEW.data_desligamento IS NULL THEN
    RAISE EXCEPTION 'Informe a data de desligamento para marcar o candidato como desligado.';
  END IF;
  IF NEW.status = 'ativo' THEN
    NEW.data_desligamento := NULL;
  END IF;
  IF NEW.data_desligamento IS NOT NULL AND NEW.data_admissao IS NOT NULL
     AND NEW.data_desligamento < NEW.data_admissao THEN
    RAISE EXCEPTION 'A data de desligamento não pode ser anterior à data de admissão.';
  END IF;
  RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.sincronizar_pagamento_vaga()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'PRESENCA' THEN
      UPDATE public.pagamentos SET status = 'AGUARDANDO', updated_at = now()
        WHERE vaga_id = NEW.id AND status = 'BLOQUEADO';
    ELSE
      UPDATE public.pagamentos SET status = 'BLOQUEADO', pago_em = NULL, pago_por = NULL,
             pago_por_nome = '', updated_at = now()
        WHERE vaga_id = NEW.id AND status <> 'PAGO';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sincronizar_perfil_funcao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _base text;
  _chave text;
  _i int := 0;
  _perfil uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.perfil_id IS NOT NULL THEN
      RETURN NEW;
    END IF;

    _base := 'funcao_' || regexp_replace(
      lower(translate(NEW.nome,
        'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇáàãâäéèêëíìîïóòõôöúùûüç',
        'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc')),
      '[^a-z0-9]+', '_', 'g');
    _base := trim(both '_' from _base);
    _chave := _base;

    WHILE EXISTS (
      SELECT 1 FROM public.perfis_acesso p
      WHERE p.tenant_id = NEW.tenant_id AND p.chave = _chave
    ) LOOP
      _i := _i + 1;
      _chave := _base || '_' || _i;
    END LOOP;

    INSERT INTO public.perfis_acesso (chave, nome, descricao, sistema, ativo, tenant_id)
    VALUES (_chave, NEW.nome, COALESCE(NEW.descricao, ''), false, COALESCE(NEW.ativo, true), NEW.tenant_id)
    RETURNING id INTO _perfil;

    NEW.perfil_id := _perfil;
    RETURN NEW;
  END IF;

  IF NEW.perfil_id IS NOT NULL AND (
       NEW.nome IS DISTINCT FROM OLD.nome
    OR NEW.descricao IS DISTINCT FROM OLD.descricao
    OR NEW.ativo IS DISTINCT FROM OLD.ativo
  ) THEN
    UPDATE public.perfis_acesso
       SET nome = NEW.nome,
           descricao = COALESCE(NEW.descricao, ''),
           ativo = COALESCE(NEW.ativo, true),
           updated_at = now()
     WHERE id = NEW.perfil_id;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.slug_publico(_texto text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT btrim(regexp_replace(
    lower(translate(coalesce(_texto, ''),
      'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ',
      'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn')),
    '[^a-z0-9]+', '-', 'g'), '-')
$function$
;

CREATE OR REPLACE FUNCTION public.somente_dashboard(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT NOT public.pode_operar(_user_id)
     AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('supervisor','coordenador','comercial'))
$function$
;

CREATE OR REPLACE FUNCTION public.tem_permissao(_user_id uuid, _modulo text, _acao text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN public.eh_master(_user_id) THEN true
    ELSE COALESCE(
      (SELECT u.permitido FROM public.permissoes_usuario u
        WHERE u.user_id = _user_id AND u.modulo = _modulo AND u.acao = _acao),
      (SELECT pp.permitido FROM public.perfil_permissoes pp
        WHERE pp.perfil_id = public.perfil_do_usuario(_user_id)
          AND pp.modulo = _modulo AND pp.acao = _acao),
      false)
  END
$function$
;

CREATE OR REPLACE FUNCTION public.tenant_ativo()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT c.tenant_id FROM public.tenant_contexto c
      WHERE c.user_id = auth.uid() AND public.eh_super_admin(auth.uid())),
    public.tenant_do_usuario(auth.uid())
  )
$function$
;

CREATE OR REPLACE FUNCTION public.tenant_ativo_para_captacao(_tenant uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = _tenant AND t.ativo AND t.status = 'ativo'
  )
$function$
;

CREATE OR REPLACE FUNCTION public.tenant_atual()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.tenant_ativo()
$function$
;

CREATE OR REPLACE FUNCTION public.tenant_do_portal()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(public.tenant_ativo(), public.tenant_padrao())
$function$
;

CREATE OR REPLACE FUNCTION public.tenant_do_usuario(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.tenant_id FROM public.profiles p WHERE p.id = _user_id
$function$
;

CREATE OR REPLACE FUNCTION public.tenant_padrao()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id FROM public.tenants WHERE slug = 'operacao-atual'
$function$
;

CREATE OR REPLACE FUNCTION public.tenant_publico(_slug text)
 RETURNS TABLE(id uuid, nome text, slug text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT t.id, t.nome, t.slug
  FROM public.tenants t
  WHERE t.ativo
    AND t.status = 'ativo'
    AND NULLIF(btrim(coalesce(_slug, '')), '') IS NOT NULL
    AND t.slug = btrim(_slug)
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$
;

CREATE OR REPLACE FUNCTION public.validar_pagamento()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status text;
  v_uid uuid := auth.uid();
BEGIN
  SELECT v.status INTO v_status FROM public.vagas v WHERE v.id = NEW.vaga_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Programação não encontrada para este pagamento.';
  END IF;

  IF v_status <> 'PRESENCA' THEN
    IF NEW.status = 'PAGO' THEN
      RAISE EXCEPTION 'Pagamento bloqueado: a programação não está com presença confirmada.';
    END IF;
    NEW.status := 'BLOQUEADO';
  ELSIF NEW.status = 'BLOQUEADO' THEN
    NEW.status := 'AGUARDANDO';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'PAGO' AND NEW.status = 'PAGO' THEN
    RAISE EXCEPTION 'Este pagamento já foi registrado como pago.';
  END IF;

  IF NEW.status = 'PAGO' THEN
    NEW.pago_em := COALESCE(NEW.pago_em, now());
    NEW.pago_por := COALESCE(NEW.pago_por, v_uid);
    IF COALESCE(NEW.pago_por_nome, '') = '' THEN
      NEW.pago_por_nome := COALESCE((SELECT p.nome FROM public.profiles p WHERE p.id = v_uid), '');
    END IF;
  ELSE
    NEW.pago_em := NULL;
    NEW.pago_por := NULL;
    NEW.pago_por_nome := '';
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validar_tenant_publico_diaria()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.tenant_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.tenants t
                     WHERE t.id = NEW.tenant_id AND t.ativo AND t.status = 'ativo') THEN
    RAISE EXCEPTION 'Cadastro indisponível: o link não pertence a uma empresa ativa.' USING ERRCODE = '42501';
  END IF;
  -- Visitante não define status administrativo.
  NEW.status := 'novo';
  RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.verificar_bloqueio(_cpf text, _empresa_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(bloqueado boolean, motivo text, tipo_bloqueio text, empresa_id uuid, empresa_nome text, created_at timestamp with time zone, bloqueado_por_nome text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT true, b.motivo, b.tipo_bloqueio, b.empresa_id, COALESCE(e.nome, ''), b.created_at, b.bloqueado_por_nome
  FROM public.colaboradores_bloqueados b
  LEFT JOIN public.empresas e ON e.id = b.empresa_id
  WHERE b.ativo
    AND b.cpf = regexp_replace(COALESCE(_cpf,''), '\D', '', 'g')
    AND (b.tipo_bloqueio = 'TODAS_EMPRESAS'
         OR (_empresa_id IS NOT NULL AND b.empresa_id = _empresa_id))
    AND auth.uid() IS NOT NULL
  ORDER BY (b.tipo_bloqueio = 'TODAS_EMPRESAS') DESC, b.created_at DESC
  LIMIT 1
$function$
;


-- ================= TRIGGERS =================
CREATE TRIGGER trg_alertas_operacao_updated BEFORE UPDATE ON public.alertas_operacao FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_tenant_alertas_operacao BEFORE INSERT OR UPDATE ON public.alertas_operacao FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER trg_tenant_auditoria BEFORE INSERT OR UPDATE ON public.auditoria FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER trg_backup_agendamento_updated BEFORE UPDATE ON public.backup_agendamento FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_tenant_backup_agendamento BEFORE INSERT OR UPDATE ON public.backup_agendamento FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER trg_backups_updated BEFORE UPDATE ON public.backups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_tenant_backups BEFORE INSERT OR UPDATE ON public.backups FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER trg_tenant_candidatos BEFORE INSERT OR UPDATE ON public.candidatos FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER trg_auditoria_candidatos AFTER INSERT OR DELETE OR UPDATE ON public.candidatos FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();
CREATE TRIGGER trg_candidatos_updated BEFORE UPDATE ON public.candidatos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_auditoria_colaboradores AFTER INSERT OR DELETE OR UPDATE ON public.colaboradores FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();
CREATE TRIGGER trg_colaboradores_updated BEFORE UPDATE ON public.colaboradores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_tenant_colaboradores BEFORE INSERT OR UPDATE ON public.colaboradores FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER trg_bloqueados_updated BEFORE UPDATE ON public.colaboradores_bloqueados FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_auditoria_bloqueados AFTER INSERT OR DELETE OR UPDATE ON public.colaboradores_bloqueados FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();
CREATE TRIGGER trg_tenant_colaboradores_bloqueados BEFORE INSERT OR UPDATE ON public.colaboradores_bloqueados FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER trg_tenant_configuracoes BEFORE INSERT OR UPDATE ON public.configuracoes FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER trg_conversa_vazia AFTER DELETE ON public.conversa_participantes FOR EACH ROW EXECUTE FUNCTION limpar_conversa_vazia();
CREATE TRIGGER trg_conversas_updated BEFORE UPDATE ON public.conversas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_tenant_conversas BEFORE INSERT OR UPDATE ON public.conversas FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER trg_validar_tenant_publico_diaria BEFORE INSERT ON public.daily_workers FOR EACH ROW EXECUTE FUNCTION validar_tenant_publico_diaria();
CREATE TRIGGER trg_tenant_daily_workers BEFORE INSERT OR UPDATE ON public.daily_workers FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER trg_daily_workers_updated BEFORE UPDATE ON public.daily_workers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_notificar_diaria AFTER INSERT ON public.daily_workers FOR EACH ROW EXECUTE FUNCTION notificar_novo_colaborador_diaria();
CREATE TRIGGER trg_empresas_updated BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_tenant_empresas BEFORE INSERT OR UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER trg_auditoria_empresas AFTER INSERT OR DELETE OR UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();
CREATE TRIGGER trg_tenant_erros_sistema BEFORE INSERT OR UPDATE ON public.erros_sistema FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER trg_erros_sistema_updated BEFORE UPDATE ON public.erros_sistema FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER feedback_config_updated_at BEFORE UPDATE ON public.feedback_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_auditoria_feedback_config AFTER INSERT OR DELETE OR UPDATE ON public.feedback_config FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();
CREATE TRIGGER feedback_config_tenant BEFORE INSERT OR UPDATE ON public.feedback_config FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER feedbacks_tenant BEFORE INSERT OR UPDATE ON public.feedbacks FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER feedbacks_updated_at BEFORE UPDATE ON public.feedbacks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_sincronizar_perfil_funcao_ins BEFORE INSERT ON public.funcoes FOR EACH ROW EXECUTE FUNCTION sincronizar_perfil_funcao();
CREATE TRIGGER trg_sincronizar_perfil_funcao_upd AFTER UPDATE ON public.funcoes FOR EACH ROW EXECUTE FUNCTION sincronizar_perfil_funcao();
CREATE TRIGGER trg_tenant_funcoes BEFORE INSERT OR UPDATE ON public.funcoes FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER trg_funcoes_updated BEFORE UPDATE ON public.funcoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_tenant_importacoes BEFORE INSERT OR UPDATE ON public.importacoes FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER trg_mensagens_updated BEFORE UPDATE ON public.mensagens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_tenant_notificacoes BEFORE INSERT OR UPDATE ON public.notificacoes FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER pagamentos_updated_at BEFORE UPDATE ON public.pagamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER pagamentos_tenant BEFORE INSERT OR UPDATE ON public.pagamentos FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER pagamentos_validar BEFORE INSERT OR UPDATE ON public.pagamentos FOR EACH ROW EXECUTE FUNCTION validar_pagamento();
CREATE TRIGGER trg_auditoria_perfil_perm AFTER INSERT OR DELETE OR UPDATE ON public.perfil_permissoes FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();
CREATE TRIGGER trg_perfil_perm_updated BEFORE UPDATE ON public.perfil_permissoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_tenant_perfil_permissoes BEFORE INSERT OR UPDATE ON public.perfil_permissoes FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER trg_auditoria_perfis AFTER INSERT OR DELETE OR UPDATE ON public.perfis_acesso FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();
CREATE TRIGGER trg_perfis_updated BEFORE UPDATE ON public.perfis_acesso FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_tenant_perfis_acesso BEFORE INSERT OR UPDATE ON public.perfis_acesso FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER trg_tenant_permissoes_usuario BEFORE INSERT OR UPDATE ON public.permissoes_usuario FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER trg_perm_usuario_updated BEFORE UPDATE ON public.permissoes_usuario FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_auditoria_perm_usuario AFTER INSERT OR DELETE OR UPDATE ON public.permissoes_usuario FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();
CREATE TRIGGER trg_planos_updated BEFORE UPDATE ON public.planos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_presenca_updated BEFORE UPDATE ON public.presenca_usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_tenant_presenca_usuarios BEFORE INSERT OR UPDATE ON public.presenca_usuarios FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER trg_proteger_campos_privilegiados BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION proteger_campos_privilegiados();
CREATE TRIGGER trg_proteger_master BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION proteger_ultimo_master();
CREATE TRIGGER trg_tenant_profiles BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_tenant_quinzenas_historico BEFORE INSERT OR UPDATE ON public.quinzenas_historico FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER trg_rs_validar_candidato BEFORE INSERT OR UPDATE ON public.rs_candidatos FOR EACH ROW EXECUTE FUNCTION rs_validar_candidato();
CREATE TRIGGER trg_rs_candidatos_updated BEFORE UPDATE ON public.rs_candidatos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_rs_historico AFTER INSERT OR UPDATE ON public.rs_candidatos FOR EACH ROW EXECUTE FUNCTION rs_registrar_historico();
CREATE TRIGGER trg_tenant_rs_candidatos BEFORE INSERT OR UPDATE ON public.rs_candidatos FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER update_rs_cargos_updated_at BEFORE UPDATE ON public.rs_cargos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_tenant_rs_cargos BEFORE INSERT OR UPDATE ON public.rs_cargos FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER trg_tenant_rs_empresas BEFORE INSERT OR UPDATE ON public.rs_empresas FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER trg_rs_empresas_updated BEFORE UPDATE ON public.rs_empresas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_tenant_rs_historico BEFORE INSERT OR UPDATE ON public.rs_historico FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER trg_tenant_contexto_updated BEFORE UPDATE ON public.tenant_contexto FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_troca_tenant AFTER INSERT OR UPDATE ON public.tenant_contexto FOR EACH ROW EXECUTE FUNCTION registrar_troca_tenant();
CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_tenant_user_access_logs BEFORE INSERT OR UPDATE ON public.user_access_logs FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER vagas_sincronizar_pagamento AFTER UPDATE ON public.vagas FOR EACH ROW EXECUTE FUNCTION sincronizar_pagamento_vaga();
CREATE TRIGGER trg_vagas_updated BEFORE UPDATE ON public.vagas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_tenant_vagas BEFORE INSERT OR UPDATE ON public.vagas FOR EACH ROW EXECUTE FUNCTION aplicar_tenant();
CREATE TRIGGER trg_auditoria_vagas AFTER INSERT OR DELETE OR UPDATE ON public.vagas FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();
CREATE TRIGGER trg_impedir_vaga_bloqueada BEFORE INSERT OR UPDATE OF candidato_id, empresa_id, status ON public.vagas FOR EACH ROW EXECUTE FUNCTION impedir_vaga_bloqueada();

-- ================= ÍNDICES =================
CREATE UNIQUE INDEX admin_pin_pkey ON public.admin_pin USING btree (id);
CREATE UNIQUE INDEX alertas_operacao_pkey ON public.alertas_operacao USING btree (id);
CREATE UNIQUE INDEX alertas_operacao_tenant_chave_uidx ON public.alertas_operacao USING btree (tenant_id, chave);
CREATE INDEX idx_alertas_operacao_tenant ON public.alertas_operacao USING btree (tenant_id);
CREATE UNIQUE INDEX app_user_connections_pkey ON public.app_user_connections USING btree (id);
CREATE UNIQUE INDEX app_user_connections_user_id_connector_id_key ON public.app_user_connections USING btree (user_id, connector_id);
CREATE UNIQUE INDEX auditoria_pkey ON public.auditoria USING btree (id);
CREATE INDEX idx_auditoria_created_at ON public.auditoria USING btree (created_at DESC);
CREATE INDEX idx_auditoria_tabela ON public.auditoria USING btree (tabela);
CREATE INDEX idx_auditoria_tenant ON public.auditoria USING btree (tenant_id);
CREATE UNIQUE INDEX backup_agendamento_pkey ON public.backup_agendamento USING btree (tenant_id);
CREATE UNIQUE INDEX backup_agendamento_tenant_uidx ON public.backup_agendamento USING btree (tenant_id);
CREATE INDEX idx_backup_agendamento_tenant ON public.backup_agendamento USING btree (tenant_id);
CREATE UNIQUE INDEX backups_pkey ON public.backups USING btree (id);
CREATE INDEX idx_backups_created_at ON public.backups USING btree (created_at DESC);
CREATE INDEX idx_backups_tenant ON public.backups USING btree (tenant_id);
CREATE UNIQUE INDEX candidatos_pkey ON public.candidatos USING btree (id);
CREATE UNIQUE INDEX candidatos_tenant_cpf_uidx ON public.candidatos USING btree (tenant_id, cpf);
CREATE INDEX idx_candidatos_precisa_fretado ON public.candidatos USING btree (precisa_fretado);
CREATE INDEX idx_candidatos_tenant ON public.candidatos USING btree (tenant_id);
CREATE INDEX idx_candidatos_transporte_tipos ON public.candidatos USING gin (transporte_tipos);
CREATE UNIQUE INDEX colaboradores_pkey ON public.colaboradores USING btree (id);
CREATE UNIQUE INDEX colaboradores_tenant_nome_uidx ON public.colaboradores USING btree (tenant_id, nome);
CREATE INDEX idx_colaboradores_tenant ON public.colaboradores USING btree (tenant_id);
CREATE UNIQUE INDEX colaboradores_bloqueados_pkey ON public.colaboradores_bloqueados USING btree (id);
CREATE INDEX idx_colaboradores_bloqueados_tenant ON public.colaboradores_bloqueados USING btree (tenant_id);
CREATE INDEX ix_bloqueio_cpf_ativo ON public.colaboradores_bloqueados USING btree (cpf) WHERE ativo;
CREATE UNIQUE INDEX ux_bloqueio_ativo_empresa ON public.colaboradores_bloqueados USING btree (tenant_id, cpf, empresa_id) WHERE (ativo AND (tipo_bloqueio = 'EMPRESA_ESPECIFICA'::text));
CREATE UNIQUE INDEX ux_bloqueio_ativo_geral ON public.colaboradores_bloqueados USING btree (tenant_id, cpf) WHERE (ativo AND (tipo_bloqueio = 'TODAS_EMPRESAS'::text));
CREATE UNIQUE INDEX configuracoes_pkey ON public.configuracoes USING btree (id);
CREATE UNIQUE INDEX configuracoes_tenant_chave_uidx ON public.configuracoes USING btree (tenant_id, chave);
CREATE INDEX idx_configuracoes_tenant ON public.configuracoes USING btree (tenant_id);
CREATE UNIQUE INDEX conversa_participantes_conversa_id_user_id_key ON public.conversa_participantes USING btree (conversa_id, user_id);
CREATE UNIQUE INDEX conversa_participantes_pkey ON public.conversa_participantes USING btree (id);
CREATE INDEX idx_cp_conversa ON public.conversa_participantes USING btree (conversa_id);
CREATE INDEX idx_cp_user ON public.conversa_participantes USING btree (user_id);
CREATE UNIQUE INDEX conversas_chave_direta_key ON public.conversas USING btree (chave_direta);
CREATE UNIQUE INDEX conversas_pkey ON public.conversas USING btree (id);
CREATE INDEX idx_conversas_tenant ON public.conversas USING btree (tenant_id);
CREATE UNIQUE INDEX cron_secrets_pkey ON public.cron_secrets USING btree (nome);
CREATE UNIQUE INDEX daily_workers_pkey ON public.daily_workers USING btree (id);
CREATE UNIQUE INDEX daily_workers_tenant_cpf_uidx ON public.daily_workers USING btree (tenant_id, cpf) WHERE (cpf <> ''::text);
CREATE UNIQUE INDEX daily_workers_tenant_phone_uidx ON public.daily_workers USING btree (tenant_id, phone) WHERE (phone <> ''::text);
CREATE INDEX idx_daily_workers_tenant ON public.daily_workers USING btree (tenant_id);
CREATE UNIQUE INDEX empresas_pkey ON public.empresas USING btree (id);
CREATE UNIQUE INDEX empresas_tenant_nome_uidx ON public.empresas USING btree (tenant_id, nome);
CREATE INDEX idx_empresas_tenant ON public.empresas USING btree (tenant_id);
CREATE INDEX erros_sistema_componente_idx ON public.erros_sistema USING btree (componente, ultima_ocorrencia DESC);
CREATE UNIQUE INDEX erros_sistema_pkey ON public.erros_sistema USING btree (id);
CREATE INDEX erros_sistema_status_idx ON public.erros_sistema USING btree (codigo_http, ultima_ocorrencia DESC);
CREATE UNIQUE INDEX erros_sistema_tenant_fingerprint_uidx ON public.erros_sistema USING btree (tenant_id, fingerprint, user_id);
CREATE INDEX erros_sistema_tenant_status_idx ON public.erros_sistema USING btree (tenant_id, status, arquivado_em, ultima_ocorrencia DESC);
CREATE INDEX erros_sistema_ultima_idx ON public.erros_sistema USING btree (ultima_ocorrencia DESC);
CREATE UNIQUE INDEX feedback_config_empresa_idx ON public.feedback_config USING btree (empresa_id) WHERE (empresa_id IS NOT NULL);
CREATE UNIQUE INDEX feedback_config_pkey ON public.feedback_config USING btree (id);
CREATE UNIQUE INDEX feedback_config_rs_empresa_idx ON public.feedback_config USING btree (rs_empresa_id) WHERE (rs_empresa_id IS NOT NULL);
CREATE UNIQUE INDEX feedback_respostas_feedback_id_key ON public.feedback_respostas USING btree (feedback_id);
CREATE UNIQUE INDEX feedback_respostas_pkey ON public.feedback_respostas USING btree (id);
CREATE INDEX feedback_respostas_tenant_idx ON public.feedback_respostas USING btree (tenant_id, created_at DESC);
CREATE UNIQUE INDEX feedbacks_pkey ON public.feedbacks USING btree (id);
CREATE UNIQUE INDEX feedbacks_semanal_unico_idx ON public.feedbacks USING btree (tenant_id, tipo, escopo, COALESCE(empresa_id, rs_empresa_id), periodo_inicio) WHERE (tipo = ANY (ARRAY['diaria_semanal'::text, 'clt_semanal'::text]));
CREATE INDEX feedbacks_tenant_status_idx ON public.feedbacks USING btree (tenant_id, status, created_at DESC);
CREATE UNIQUE INDEX feedbacks_token_key ON public.feedbacks USING btree (token);
CREATE UNIQUE INDEX funcoes_pkey ON public.funcoes USING btree (id);
CREATE UNIQUE INDEX funcoes_tenant_nome_uk ON public.funcoes USING btree (tenant_id, upper(nome));
CREATE INDEX idx_importacoes_tenant ON public.importacoes USING btree (tenant_id);
CREATE UNIQUE INDEX importacoes_pkey ON public.importacoes USING btree (id);
CREATE INDEX idx_msg_conversa ON public.mensagens USING btree (conversa_id, created_at DESC);
CREATE UNIQUE INDEX mensagens_pkey ON public.mensagens USING btree (id);
CREATE INDEX idx_notificacoes_tenant ON public.notificacoes USING btree (tenant_id);
CREATE UNIQUE INDEX notificacoes_pkey ON public.notificacoes USING btree (id);
CREATE UNIQUE INDEX notificacoes_tenant_user_chave_uidx ON public.notificacoes USING btree (tenant_id, user_id, chave);
CREATE UNIQUE INDEX pagamentos_pkey ON public.pagamentos USING btree (id);
CREATE INDEX pagamentos_tenant_status_idx ON public.pagamentos USING btree (tenant_id, status);
CREATE UNIQUE INDEX pagamentos_vaga_id_key ON public.pagamentos USING btree (vaga_id);
CREATE INDEX idx_perfil_permissoes_tenant ON public.perfil_permissoes USING btree (tenant_id);
CREATE UNIQUE INDEX perfil_permissoes_perfil_id_modulo_acao_key ON public.perfil_permissoes USING btree (perfil_id, modulo, acao);
CREATE UNIQUE INDEX perfil_permissoes_pkey ON public.perfil_permissoes USING btree (id);
CREATE INDEX idx_perfis_acesso_tenant ON public.perfis_acesso USING btree (tenant_id);
CREATE UNIQUE INDEX perfis_acesso_pkey ON public.perfis_acesso USING btree (id);
CREATE UNIQUE INDEX perfis_acesso_tenant_chave_uidx ON public.perfis_acesso USING btree (tenant_id, chave);
CREATE INDEX idx_permissoes_usuario_tenant ON public.permissoes_usuario USING btree (tenant_id);
CREATE UNIQUE INDEX permissoes_usuario_pkey ON public.permissoes_usuario USING btree (id);
CREATE UNIQUE INDEX permissoes_usuario_user_id_modulo_acao_key ON public.permissoes_usuario USING btree (user_id, modulo, acao);
CREATE UNIQUE INDEX planos_chave_key ON public.planos USING btree (chave);
CREATE UNIQUE INDEX planos_pkey ON public.planos USING btree (id);
CREATE UNIQUE INDEX presenca_usuarios_pkey ON public.presenca_usuarios USING btree (user_id);
CREATE INDEX idx_profiles_funcao_id ON public.profiles USING btree (funcao_id);
CREATE INDEX idx_profiles_tenant ON public.profiles USING btree (tenant_id);
CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);
CREATE INDEX idx_quinzenas_historico_tenant ON public.quinzenas_historico USING btree (tenant_id);
CREATE UNIQUE INDEX quinzenas_historico_pkey ON public.quinzenas_historico USING btree (id);
CREATE UNIQUE INDEX quinzenas_tenant_chave_uidx ON public.quinzenas_historico USING btree (tenant_id, chave);
CREATE UNIQUE INDEX reacoes_mensagem_mensagem_id_user_id_key ON public.reacoes_mensagem USING btree (mensagem_id, user_id);
CREATE UNIQUE INDEX reacoes_mensagem_pkey ON public.reacoes_mensagem USING btree (id);
CREATE INDEX idx_rs_candidatos_tenant ON public.rs_candidatos USING btree (tenant_id);
CREATE INDEX rs_candidatos_empresa_idx ON public.rs_candidatos USING btree (empresa_id);
CREATE UNIQUE INDEX rs_candidatos_pkey ON public.rs_candidatos USING btree (id);
CREATE INDEX rs_candidatos_status_idx ON public.rs_candidatos USING btree (status);
CREATE UNIQUE INDEX rs_candidatos_tenant_cpf_uidx ON public.rs_candidatos USING btree (tenant_id, cpf) WHERE (cpf <> ''::text);
CREATE INDEX idx_rs_cargos_tenant ON public.rs_cargos USING btree (tenant_id);
CREATE UNIQUE INDEX rs_cargos_pkey ON public.rs_cargos USING btree (id);
CREATE UNIQUE INDEX rs_cargos_tenant_nome_uidx ON public.rs_cargos USING btree (tenant_id, lower(nome));
CREATE INDEX idx_rs_empresas_tenant ON public.rs_empresas USING btree (tenant_id);
CREATE UNIQUE INDEX rs_empresas_pkey ON public.rs_empresas USING btree (id);
CREATE UNIQUE INDEX rs_empresas_tenant_nome_uidx ON public.rs_empresas USING btree (tenant_id, lower(nome));
CREATE INDEX idx_rs_historico_tenant ON public.rs_historico USING btree (tenant_id);
CREATE INDEX rs_historico_candidato_idx ON public.rs_historico USING btree (candidato_id, created_at DESC);
CREATE UNIQUE INDEX rs_historico_pkey ON public.rs_historico USING btree (id);
CREATE UNIQUE INDEX super_admins_pkey ON public.super_admins USING btree (user_id);
CREATE UNIQUE INDEX tenant_contexto_pkey ON public.tenant_contexto USING btree (user_id);
CREATE UNIQUE INDEX tenants_pkey ON public.tenants USING btree (id);
CREATE UNIQUE INDEX tenants_slug_key ON public.tenants USING btree (slug);
CREATE UNIQUE INDEX tenants_log_pkey ON public.tenants_log USING btree (id);
CREATE INDEX idx_user_access_logs_login_at ON public.user_access_logs USING btree (login_at DESC);
CREATE INDEX idx_user_access_logs_user ON public.user_access_logs USING btree (user_id, login_at DESC);
CREATE UNIQUE INDEX user_access_logs_pkey ON public.user_access_logs USING btree (id);
CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (id);
CREATE UNIQUE INDEX user_roles_user_id_role_key ON public.user_roles USING btree (user_id, role);
CREATE INDEX idx_vagas_colaborador ON public.vagas USING btree (colaborador_id);
CREATE INDEX idx_vagas_data ON public.vagas USING btree (data);
CREATE INDEX idx_vagas_empresa ON public.vagas USING btree (empresa_id);
CREATE INDEX idx_vagas_situacao ON public.vagas USING btree (situacao);
CREATE INDEX idx_vagas_status ON public.vagas USING btree (status);
CREATE INDEX idx_vagas_tenant ON public.vagas USING btree (tenant_id);
CREATE UNIQUE INDEX vagas_hash_registro_key ON public.vagas USING btree (hash_registro);
CREATE UNIQUE INDEX vagas_pkey ON public.vagas USING btree (id);
