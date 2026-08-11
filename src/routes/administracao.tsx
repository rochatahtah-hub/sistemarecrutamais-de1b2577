import { createFileRoute, Link } from "@tanstack/react-router";
import { DatabaseBackup, KeyRound, Settings2, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { RequerAdmin } from "@/components/RequerAdmin";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PainelBanco } from "@/components/admin/PainelBanco";
import { PainelColaboradores } from "@/components/admin/PainelColaboradores";
import { PainelManutencao } from "@/components/admin/PainelManutencao";
import { PainelEmailBackup } from "@/components/admin/PainelEmailBackup";
import { PainelUsuarios } from "@/components/admin/PainelUsuarios";
import { ResumoAcessos } from "@/components/admin/ResumoAcessos";
import { GerenciarEmpresas } from "@/components/programacao/GerenciarEmpresas";

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