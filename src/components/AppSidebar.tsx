import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
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
} from "lucide-react";

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

const operacao = [
  { title: "Minha Programação", url: "/minha-programacao", icon: CalendarCheck },
  { title: "Cadastrar Candidato", url: "/candidatos", icon: IdCard },
] as const;

const analise = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Confirmações", url: "/confirmacoes", icon: ClipboardCheck },
  { title: "Programadoras", url: "/programadoras", icon: UserCog },
  { title: "Colaboradores", url: "/colaboradores", icon: Users },
  { title: "Empresas", url: "/empresas", icon: Building2 },
  { title: "Vagas", url: "/vagas", icon: Table2 },
] as const;

const ferramentas = [
  { title: "Importar Excel", url: "/importar", icon: FileSpreadsheet },
  { title: "Comparar períodos", url: "/comparar", icon: GitCompareArrows },
  { title: "Relatórios", url: "/relatorios", icon: FileText },
  { title: "Histórico", url: "/historico", icon: Archive },
  { title: "Metas", url: "/metas", icon: Target },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const isActive = (url: string) => (url === "/" ? pathname === "/" : pathname.startsWith(url));

  const renderItens = (itens: ReadonlyArray<{ title: string; url: string; icon: typeof Users }>) => (
    <SidebarMenu>
      {itens.map((item) => (
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
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary">
            <BarChart3 className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold text-gradient-gold">
                Programação & Vagas
              </p>
              <p className="truncate text-[11px] text-muted-foreground">Recrutamento & Seleção</p>
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
          <SidebarGroupLabel>Análise</SidebarGroupLabel>
          <SidebarGroupContent>{renderItens(analise)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Ferramentas</SidebarGroupLabel>
          <SidebarGroupContent>{renderItens(ferramentas)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}