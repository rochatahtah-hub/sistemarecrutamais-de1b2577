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
} from "lucide-react";
import { useAuth } from "@/lib/auth";

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
  "/importar",
  "/metas",
  "/bloqueios",
  "/auditoria",
  "/configuracoes",
  "/saude-sistema",
]);

const operacao = [
  { title: "Minha Programação", url: "/minha-programacao", icon: CalendarCheck },
  { title: "Programações da equipe", url: "/programadoras", icon: UserCog },
  { title: "Cadastrar Candidato", url: "/candidatos", icon: IdCard },
  { title: "Vagas", url: "/vagas", icon: Table2 },
] as const;

const gestao = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Confirmações", url: "/confirmacoes", icon: ClipboardCheck },
  { title: "Equipe", url: "/colaboradores", icon: Users },
  { title: "Empresas", url: "/empresas", icon: Building2 },
  { title: "Performance", url: "/performance", icon: Trophy },
] as const;

const inteligencia = [
  { title: "Análise Inteligente", url: "/analise", icon: Bot },
  { title: "Radar da Operação", url: "/radar", icon: Radar },
  { title: "Comparar Períodos", url: "/comparar", icon: GitCompareArrows },
] as const;

const ferramentas = [
  { title: "Relatórios", url: "/relatorios", icon: FileText },
  { title: "Importar Excel", url: "/importar", icon: FileSpreadsheet },
  { title: "Histórico", url: "/historico", icon: Archive },
  { title: "Histórico de Alterações", url: "/auditoria", icon: History },
  { title: "Metas", url: "/metas", icon: Target },
  { title: "Bloqueios", url: "/bloqueios", icon: ShieldOff },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { isAdmin } = useAuth();
  const itensFerramentas = isAdmin
    ? [...ferramentas, { title: "Saúde do Sistema", url: "/saude-sistema", icon: Activity }]
    : ferramentas;
  const permitido = (url: string) => isAdmin || !ADMIN_ONLY.has(url);

  const isActive = (url: string) => (url === "/" ? pathname === "/" : pathname.startsWith(url));

  const renderItens = (itens: ReadonlyArray<{ title: string; url: string; icon: typeof Users }>) => (
    <SidebarMenu>
      {itens.filter((item) => permitido(item.url)).map((item) => (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
            <Link to={item.url} className="flex items-center gap-2">
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary font-display text-base font-bold leading-none text-primary-foreground">
            R<span className="text-[11px]">+</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold tracking-tight text-gradient-gold">
                RECRUTA+
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                Gestão inteligente de recrutamento.
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operação</SidebarGroupLabel>
          <SidebarGroupContent>{renderItens(operacao)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Gestão</SidebarGroupLabel>
          <SidebarGroupContent>{renderItens(gestao)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Inteligência</SidebarGroupLabel>
          <SidebarGroupContent>{renderItens(inteligencia)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Relatórios</SidebarGroupLabel>
          <SidebarGroupContent>{renderItens(itensFerramentas)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}