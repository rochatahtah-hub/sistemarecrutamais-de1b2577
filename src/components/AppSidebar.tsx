import { Link, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  ClipboardCheck,
  FileSpreadsheet,
  GitCompareArrows,
  LayoutDashboard,
  Settings,
  Table2,
  Users,
  FileText,
  CalendarCheck,
  IdCard,
  Target,
  Archive,
  UserCog,
  ShieldOff,
  Activity,
  Bot,
  Radar,
  Trophy,
  History,
  DatabaseBackup,
  KeyRound,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePrivacidade } from "@/lib/privacidade";
import { useChatRealtime, useTotalNaoLidas } from "@/lib/chat";
import { AvatarUsuario } from "@/components/AvatarUsuario";
import logoLockup from "@/assets/recruta-lockup.png.asset.json";
import logoMarca from "@/assets/recruta-mark.png.asset.json";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const ADMIN_ONLY = new Set([
  "/programadoras",
  "/administracao",
  "/importar",
  "/metas",
  "/bloqueios",
  "/auditoria",
  "/configuracoes",
  "/saude-sistema",
  "/backups",
  "/acessos",
]);

const principal = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Minha Programação", url: "/minha-programacao", icon: CalendarCheck },
  { title: "Vagas", url: "/vagas", icon: Table2 },
  { title: "Cadastrar Candidato", url: "/candidatos", icon: IdCard },
  { title: "Confirmações", url: "/confirmacoes", icon: ClipboardCheck },
] as const;

const gestao = [
  { title: "Programações da equipe", url: "/programadoras", icon: UserCog },
  { title: "Equipe", url: "/colaboradores", icon: Users },
  { title: "Empresas", url: "/empresas", icon: Building2 },
  { title: "Metas", url: "/metas", icon: Target },
  { title: "Bloqueios", url: "/bloqueios", icon: ShieldOff },
] as const;

const analises = [
  { title: "Performance", url: "/performance", icon: Trophy },
  { title: "Análise Inteligente", url: "/analise", icon: Bot },
  { title: "Radar da Operação", url: "/radar", icon: Radar },
  { title: "Comparar Períodos", url: "/comparar", icon: GitCompareArrows },
  { title: "Relatórios", url: "/relatorios", icon: FileText },
] as const;

const comunicacao = [{ title: "Chat", url: "/chat", icon: MessageCircle }] as const;

const ferramentas = [
  { title: "Central de Administração", url: "/administracao", icon: ShieldCheck },
  { title: "Importar Excel", url: "/importar", icon: FileSpreadsheet },
  { title: "Histórico", url: "/historico", icon: Archive },
  { title: "Histórico de Alterações", url: "/auditoria", icon: History },
  { title: "Histórico de Acessos", url: "/acessos", icon: KeyRound },
  { title: "Backups", url: "/backups", icon: DatabaseBackup },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { isAdmin, perfil } = useAuth();
  const { privado } = usePrivacidade();
  useChatRealtime();
  const naoLidas = useTotalNaoLidas();
  const itensFerramentas = isAdmin
    ? [...ferramentas, { title: "Saúde do Sistema", url: "/saude-sistema", icon: Activity }]
    : ferramentas;
  const permitido = (url: string) => isAdmin || !ADMIN_ONLY.has(url);

  const isActive = (url: string) => (url === "/" ? pathname === "/" : pathname.startsWith(url));

  const renderItens = (itens: ReadonlyArray<{ title: string; url: string; icon: typeof Users }>) => (
    <SidebarMenu className="gap-0.5">
      {itens.filter((item) => permitido(item.url)).map((item) => (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton
            asChild
            isActive={isActive(item.url)}
            tooltip={item.title}
            className="group/nav relative h-9 overflow-hidden rounded-lg pl-3 text-[13px] font-medium text-sidebar-foreground/70 transition-all duration-200 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1/2 data-[active=true]:before:h-5 data-[active=true]:before:w-[3px] data-[active=true]:before:-translate-y-1/2 data-[active=true]:before:rounded-r-full data-[active=true]:before:bg-sidebar-primary"
          >
            <Link to={item.url} className="flex items-center gap-2.5">
              <item.icon
                className={`h-4 w-4 shrink-0 transition-colors ${isActive(item.url) ? "text-sidebar-primary" : "text-sidebar-foreground/55 group-hover/nav:text-sidebar-foreground/85"}`}
                strokeWidth={1.75}
              />
              {!collapsed && <span className="truncate">{item.title}</span>}
              {item.url === "/chat" && naoLidas > 0 && (
                <span className="ml-auto grid h-4 min-w-4 shrink-0 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold leading-none text-primary">
                  {naoLidas > 99 ? "99+" : naoLidas}
                </span>
              )}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border [&>div]:malha-escura">
      <SidebarHeader className="border-b border-sidebar-border/70">
        <div className="flex items-center gap-2.5 px-1 py-3">
          {collapsed ? (
            <img
              src={logoMarca.url}
              alt="Recruta+"
              className="h-9 w-9 shrink-0 object-contain"
            />
          ) : (
            <img
              src={logoLockup.url}
              alt="Recruta+ — Gestão inteligente de recrutamento"
              className="h-11 w-auto max-w-full object-contain object-left"
            />
          )}
        </div>
        <div
          className={`mb-2 flex items-center gap-2.5 rounded-xl border border-sidebar-border/60 bg-sidebar-accent/40 ${collapsed ? "justify-center px-0 py-2" : "px-2.5 py-2"}`}
        >
          <AvatarUsuario
            nome={perfil?.nome}
            caminho={perfil?.avatar_url}
            privado={privado}
            className="h-8 w-8 text-[10px]"
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-semibold leading-tight text-sidebar-foreground">
                {privado ? "Usuário oculto" : (perfil?.nome ?? "Conta")}
              </p>
              <p className="truncate text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/45">
                {isAdmin ? "Administrador" : "Programadora"}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-0.5 px-1 py-2">
        {(
          [
            ["Principal", principal],
            ["Gestão", gestao],
            ["Comunicação", comunicacao],
            ["Análises", analises],
            ["Sistema", itensFerramentas],
          ] as const
        ).map(([rotulo, itens]) => (
          <SidebarGroup key={rotulo}>
            <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/40">
              {rotulo}
            </SidebarGroupLabel>
            <SidebarGroupContent>{renderItens(itens)}</SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}