import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Camera, Eye, EyeOff, LogOut, Settings, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { BuscaGlobal } from "@/components/BuscaGlobal";
import { AvatarUsuario } from "@/components/AvatarUsuario";
import { DialogoFotoPerfil } from "@/components/DialogoFotoPerfil";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePrivacidade } from "@/lib/privacidade";
import { useConfiguracoes } from "@/lib/dados";
import { useMarcarNotificacoesLidas, useNotificacoes } from "@/lib/programacao";

function dentroDoExpediente(inicio: string, fim: string) {
  const agora = new Date();
  const hhmm = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
  const diaUtil = agora.getDay() >= 1 && agora.getDay() <= 5;
  return diaUtil && hhmm >= inicio && hhmm <= fim;
}

/** Nome da seção atual, apenas para exibição no topo. */
const SECOES: Record<string, string> = {
  "/": "Dashboard",
  "/minha-programacao": "Minha Programação",
  "/programadoras": "Programações da equipe",
  "/candidatos": "Cadastrar Candidato",
  "/vagas": "Vagas",
  "/confirmacoes": "Confirmações",
  "/chat": "Chat",
  "/colaboradores": "Equipe",
  "/empresas": "Empresas",
  "/performance": "Performance",
  "/analise": "Análise Inteligente",
  "/radar": "Radar da Operação",
  "/comparar": "Comparar Períodos",
  "/relatorios": "Relatórios",
  "/administracao": "Central de Administração",
  "/importar": "Importar Excel",
  "/historico": "Histórico",
  "/auditoria": "Histórico de Alterações",
  "/acessos": "Histórico de Acessos",
  "/backups": "Backups",
  "/metas": "Metas",
  "/bloqueios": "Bloqueios",
  "/configuracoes": "Configurações",
  "/saude-sistema": "Saúde do Sistema",
};

export function TopBar() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { perfil, user, isAdmin, sair } = useAuth();
  const { privado, alternar } = usePrivacidade();
  const { data: config } = useConfiguracoes();
  const { data: notificacoes = [] } = useNotificacoes();
  const marcarLidas = useMarcarNotificacoesLidas();
  const [fotoAberta, setFotoAberta] = useState(false);

  const naoLidas = useMemo(() => notificacoes.filter((n) => !n.lida), [notificacoes]);
  const secao = useMemo(() => {
    if (SECOES[pathname]) return SECOES[pathname];
    const base = Object.keys(SECOES)
      .filter((r) => r !== "/" && pathname.startsWith(r))
      .sort((a, b) => b.length - a.length)[0];
    return base ? SECOES[base] : "RECRUTA+";
  }, [pathname]);

  // Alerta de inatividade dentro do horario de trabalho configurado.
  useEffect(() => {
    if (!user || !perfil || !config) return;
    const horas = config.inatividadeHoras || 2;
    const checar = async () => {
      if (!dentroDoExpediente(config.expedienteInicio, config.expedienteFim)) return;
      const ultimo = perfil.ultimo_preenchimento ? new Date(perfil.ultimo_preenchimento) : null;
      const limite = horas * 3_600_000;
      if (ultimo && Date.now() - ultimo.getTime() < limite) return;
      const bucket = new Date();
      const chave = `inatividade-${bucket.toISOString().slice(0, 13)}`;
      const mensagem = `Você está há ${horas} hora(s) sem atualizar suas programações.`;
      const { error } = await supabase.from("notificacoes").upsert(
        { user_id: user.id, tipo: "inatividade", titulo: "Inatividade", mensagem, chave },
        { onConflict: "user_id,chave", ignoreDuplicates: true },
      );
      if (!error) {
        await supabase.from("notificacoes").upsert(
          {
            user_id: user.id,
            para_admin: true,
            tipo: "inatividade-admin",
            titulo: `${perfil.nome} sem atualizar`,
            mensagem: `${perfil.nome} está há ${horas} hora(s) sem inserir programações.`,
            chave: `${chave}-admin`,
          },
          { onConflict: "user_id,chave", ignoreDuplicates: true },
        );
      }
    };
    void checar();
    const id = window.setInterval(() => void checar(), 15 * 60_000);
    return () => window.clearInterval(id);
  }, [user, perfil, config]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-3 backdrop-blur-xl md:px-6">
      <SidebarTrigger className="text-muted-foreground transition-colors hover:text-foreground" />
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="hidden min-w-0 items-center gap-2 text-xs text-muted-foreground sm:flex">
          RECRUTA<span className="-ml-2 text-gold">+</span>
          <span className="text-border">/</span>
        </span>
        <h2 className="min-w-0 truncate text-[15px] font-semibold tracking-tight text-foreground">
          {secao}
        </h2>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <BuscaGlobal />
        <Button
          variant={privado ? "default" : "ghost"}
          size="sm"
          className="gap-2"
          aria-pressed={privado}
          title={privado ? "Modo Privacidade Ativado" : "Ativar Privacidade"}
          onClick={() => {
            alternar();
            toast.success(privado ? "🔓 Modo Privacidade Desativado" : "🔒 Modo Privacidade Ativado");
          }}
        >
          {privado ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span className="hidden sm:inline">{privado ? "Privacidade ativa" : "Privacidade"}</span>
        </Button>
        <DropdownMenu
          onOpenChange={(aberto) => {
            if (!aberto && naoLidas.length > 0) marcarLidas.mutate(naoLidas.map((n) => n.id));
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
              <Bell className="h-4 w-4" />
              {naoLidas.length > 0 && (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
                  {naoLidas.length > 9 ? "9+" : naoLidas.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-84 rounded-xl p-0">
            <DropdownMenuLabel className="px-4 pt-3 text-sm">Notificações</DropdownMenuLabel>
            <DropdownMenuLabel className="px-4 pb-3 pt-0 text-xs font-normal text-muted-foreground">
              {naoLidas.length > 0
                ? `${naoLidas.length} alerta(s) pendente(s)`
                : "Nenhum alerta pendente"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="m-0" />
            <div className="max-h-96 overflow-y-auto py-1">
              {notificacoes.length === 0 && (
                <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                  Nenhuma notificação.
                </p>
              )}
              {notificacoes.slice(0, 12).map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  className="flex items-start gap-3 rounded-none px-4 py-3"
                >
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.lida ? "bg-border" : "bg-gold"}`}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold">
                      {privado ? "Alerta protegido" : n.titulo}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                      {privado ? "Conteúdo oculto pelo modo privacidade." : n.mensagem}
                    </span>
                  </span>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-11 gap-2.5 rounded-xl border border-transparent pl-1.5 pr-2.5 hover:border-border hover:bg-card"
            >
              <AvatarUsuario
                nome={perfil?.nome}
                caminho={perfil?.avatar_url}
                privado={privado}
                className="h-8 w-8"
              />
              <span className="hidden min-w-0 text-left leading-tight sm:block">
                <span className="block max-w-[10rem] truncate text-[13px] font-semibold text-foreground">
                  {privado ? "Usuário oculto" : (perfil?.nome ?? "Conta")}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {isAdmin ? "Administrador" : "Programadora"}
                </span>
              </span>
              {isAdmin && <Badge variant="gold" className="hidden md:inline-flex">Admin</Badge>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 rounded-xl">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {privado ? "••••••" : (perfil?.email ?? user?.email)}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setFotoAberta(true)}>
              <Camera className="mr-2 h-4 w-4" /> Alterar foto de perfil
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem asChild>
                <Link to="/administracao">
                  <ShieldCheck className="mr-2 h-4 w-4" /> Central de Administração
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link to="/configuracoes">
                <Settings className="mr-2 h-4 w-4" /> Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                void sair().then(() => {
                  toast.success("Sessão encerrada.");
                  void navigate({ to: "/auth", replace: true });
                });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DialogoFotoPerfil aberto={fotoAberta} onOpenChange={setFotoAberta} />
      </div>
    </header>
  );
}
