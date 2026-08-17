import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  DatabaseBackup,
  KeyRound,
  Settings2,
  ShieldCheck,
} from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { RequerAdmin } from "@/components/RequerAdmin";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PainelBanco } from "@/components/admin/PainelBanco";
import { PainelColaboradores } from "@/components/admin/PainelColaboradores";
import { PainelManutencao } from "@/components/admin/PainelManutencao";
import { PainelEmailBackup } from "@/components/admin/PainelEmailBackup";
import { PainelUsuarios } from "@/components/admin/PainelUsuarios";
import { ResumoAcessos } from "@/components/admin/ResumoAcessos";
import { GerenciarEmpresas } from "@/components/programacao/GerenciarEmpresas";
import { registrarErroSistema } from "@/lib/system-health";
import { useTenantAtual } from "@/lib/tenant";

export const Route = createFileRoute("/administracao")({
  head: () => ({
    meta: [
      { title: "Central de Administração | RECRUTA+" },
      {
        name: "description",
        content:
          "Central de administração do RECRUTA+: usuários, empresas, colaboradores, banco de dados, integridade e manutenções seguras.",
      },
      { property: "og:title", content: "Central de Administração | RECRUTA+" },
      {
        property: "og:description",
        content: "Gerencie usuários, empresas, colaboradores e monitore o banco de dados do RECRUTA+.",
      },
    ],
  }),
  component: () => (
    <RequerAdmin area="Central de Administração">
      <Pagina />
    </RequerAdmin>
  ),
});

function Pagina() {
  return (
    <div className="space-y-5">
      <PageHeader
        titulo="⚙️ Central de Administração"
        descricao="Configure, gerencie e monitore o sistema sem depender de acesso técnico externo."
        acoes={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/configuracoes">
                <Settings2 className="mr-2 h-4 w-4" /> Configurações
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/backups">
                <DatabaseBackup className="mr-2 h-4 w-4" /> Backups
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/acessos">
                <KeyRound className="mr-2 h-4 w-4" /> Histórico de acessos
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/saude-sistema">
                <ShieldCheck className="mr-2 h-4 w-4" /> Saúde do sistema
              </Link>
            </Button>
          </div>
        }
      />

      <TenantAdministrativo />

      <Tabs defaultValue="usuarios">
        <TabsList className="flex w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="usuarios">👥 Usuários</TabsTrigger>
          <TabsTrigger value="empresas">🏢 Empresas</TabsTrigger>
          <TabsTrigger value="colaboradores">🧑‍🔧 Colaboradores</TabsTrigger>
          <TabsTrigger value="banco">🗄️ Banco de dados</TabsTrigger>
          <TabsTrigger value="manutencao">🛠️ Manutenção</TabsTrigger>
          <TabsTrigger value="email-backup">📧 Backups por e-mail</TabsTrigger>
        </TabsList>
        <TabsContent value="usuarios" className="space-y-4 pt-4">
          <ResumoAcessos />
          <PainelUsuarios />
        </TabsContent>
        <TabsContent value="empresas" className="pt-4">
          <GerenciarEmpresas />
        </TabsContent>
        <TabsContent value="colaboradores" className="pt-4">
          <PainelColaboradores />
        </TabsContent>
        <TabsContent value="banco" className="pt-4">
          <PainelBanco />
        </TabsContent>
        <TabsContent value="manutencao" className="pt-4">
          <PainelManutencao />
        </TabsContent>
        <TabsContent value="email-backup" className="pt-4">
          <PainelEmailBackup />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TenantAdministrativo() {
  const { data: tenant, isPending, isError, error, refetch, isFetching } = useTenantAtual();

  useEffect(() => {
    if (!isError) return;
    void registrarErroSistema(error, {
      componente: "TenantAdministrativo",
      operacao: "carregar tenant associado",
      endpoint: "tenants",
      categoria: "banco",
    });
  }, [error, isError]);

  if (isPending) {
    return (
      <section className="border-b border-border/70 pb-5" aria-label="Carregando tenant">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-64 max-w-[70vw]" />
          </div>
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Não foi possível carregar o tenant</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>A falha foi registrada para diagnóstico. Tente carregar novamente.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? "Carregando…" : "Tentar novamente"}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!tenant) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Nenhum tenant autorizado</AlertTitle>
        <AlertDescription>
          Seu perfil administrativo não possui um tenant associado no momento.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="flex flex-col gap-3 border-b border-border/70 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-gold/25 bg-gold-soft text-accent-foreground">
          <Building2 className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Tenant / Empresa</p>
          <p className="truncate text-base font-semibold text-foreground" title={tenant.nome}>
            {tenant.nome}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-[3.25rem] sm:pl-0">
        <Badge variant="outline">{tenant.slug}</Badge>
        <Badge variant={tenant.ativo && tenant.status === "ativo" ? "gold" : "secondary"}>
          {tenant.ativo && tenant.status === "ativo" && <CheckCircle2 className="mr-1 h-3 w-3" />}
          {tenant.status}
        </Badge>
      </div>
    </section>
  );
}