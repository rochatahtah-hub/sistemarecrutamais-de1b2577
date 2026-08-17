import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Check, Copy, ExternalLink, LogIn, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  useDefinirStatusTenant,
  useDependenciasTenant,
  useExcluirTenant,
  useRenomearTenant,
  useTenantAtual,
  useTenantsDisponiveis,
  useTrocarTenant,
  type Tenant,
} from "@/lib/tenant";

export const Route = createFileRoute("/empresas-sistema")({
  head: () => ({
    meta: [
      { title: "Empresas do sistema | RECRUTA+" },
      {
        name: "description",
        content:
          "Painel central das empresas do RECRUTA+: escolha a empresa ativa, acompanhe status e cadastre novas empresas.",
      },
      { property: "og:title", content: "Empresas do sistema | RECRUTA+" },
      {
        property: "og:description",
        content: "Painel central para trocar de empresa ativa e cadastrar novas empresas no RECRUTA+.",
      },
    ],
  }),
  component: Pagina,
});

function slugificar(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function Pagina() {
  const { data: atual } = useTenantAtual();
  const { data: empresas = [], isPending } = useTenantsDisponiveis();
  const trocar = useTrocarTenant();
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [filtro, setFiltro] = useState<"todas" | "ativas" | "inativas">("todas");
  const [editando, setEditando] = useState<Tenant | null>(null);
  const [excluindo, setExcluindo] = useState<Tenant | null>(null);
  const [origem, setOrigem] = useState("");
  const status = useDefinirStatusTenant();

  useEffect(() => setOrigem(window.location.origin), []);

  const criar = useMutation({
    mutationFn: async (valor: string) => {
      // Cria a empresa já provisionada (perfis, permissões e configurações iniciais).
      const { error } = await supabase.rpc("provisionar_tenant", {
        _nome: valor.trim(),
        _slug: slugificar(valor),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setNome("");
      toast.success("Empresa criada.");
      await qc.invalidateQueries({ queryKey: ["tenants-disponiveis"] });
    },
    onError: (erro) =>
      toast.error(erro instanceof Error ? erro.message : "Não foi possível criar a empresa."),
  });

  const soUma = empresas.length <= 1;
  const estaAtiva = (e: Tenant) => e.ativo && e.status === "ativo";
  const listadas = empresas.filter((e) =>
    filtro === "todas" ? true : filtro === "ativas" ? estaAtiva(e) : !estaAtiva(e),
  );

  const alternarStatus = (empresa: Tenant) => {
    const ativar = !estaAtiva(empresa);
    status.mutate(
      { tenantId: empresa.id, ativo: ativar },
      {
        onSuccess: () =>
          toast.success(
            ativar
              ? "Empresa reativada. Todos os dados foram preservados."
              : "Empresa inativada. Nenhum dado foi apagado.",
          ),
        onError: (erro) =>
          toast.error(erro instanceof Error ? erro.message : "Não foi possível alterar o status."),
      },
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="🏢 Empresas do sistema"
        descricao="Escolha a empresa em que você está operando. O sistema mostra uma empresa por vez, sem misturar dados."
      />

      <Tabs value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
        <TabsList>
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="ativas">Ativas</TabsTrigger>
          <TabsTrigger value="inativas">Inativas</TabsTrigger>
        </TabsList>
      </Tabs>

      {isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {listadas.map((empresa) => {
            const ativa = empresa.id === atual?.id;
            const habilitada = estaAtiva(empresa);
            return (
              <Card key={empresa.id} className={ativa ? "border-gold/50" : undefined}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 truncate" title={empresa.nome}>
                      {empresa.nome}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{empresa.slug}</Badge>
                    <Badge variant={habilitada ? "gold" : "secondary"}>
                      {habilitada ? "ATIVA" : "INATIVA"}
                    </Badge>
                  </div>
                  <div className="space-y-1.5 border-t border-border/60 pt-3">
                    <p className="text-xs font-medium">Link de cadastro para diárias</p>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        aria-label={`Link de cadastro de ${empresa.nome}`}
                        value={`${origem}/cadastro-diarias?empresa=${encodeURIComponent(empresa.slug)}`}
                        className="h-8 text-xs"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        title="Copiar link"
                        aria-label={`Copiar link de cadastro de ${empresa.nome}`}
                        onClick={async () => {
                          const link = `${window.location.origin}/cadastro-diarias?empresa=${encodeURIComponent(empresa.slug)}`;
                          await navigator.clipboard.writeText(link);
                          toast.success("Link de cadastro copiado.");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        title="Abrir link"
                        aria-label={`Abrir link de cadastro de ${empresa.nome}`}
                        onClick={() =>
                          window.open(
                            `${window.location.origin}/cadastro-diarias?empresa=${encodeURIComponent(empresa.slug)}`,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {ativa ? (
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-gold" /> Empresa ativa
                    </p>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={trocar.isPending || soUma}
                      onClick={() => trocar.mutate(empresa.id)}
                    >
                      <LogIn className="mr-2 h-4 w-4" /> Entrar nesta empresa
                    </Button>
                  )}
                  <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
                    <Button size="sm" variant="ghost" onClick={() => setEditando(empresa)}>
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={status.isPending}
                      onClick={() => alternarStatus(empresa)}
                    >
                      <Power className="mr-2 h-4 w-4" />
                      {habilitada ? "Inativar" : "Ativar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={habilitada}
                      title={
                        habilitada
                          ? "Empresa ativa não pode ser excluída. Inative a empresa antes."
                          : "Excluir empresa inativa"
                      }
                      onClick={() => setExcluindo(empresa)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {listadas.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma empresa neste filtro.</p>
          )}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cadastrar nova empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(evento) => {
              evento.preventDefault();
              if (!nome.trim()) return;
              criar.mutate(nome);
            }}
          >
            <div className="min-w-[16rem] flex-1 space-y-1.5">
              <Label htmlFor="nome-empresa">Nome da empresa</Label>
              <Input
                id="nome-empresa"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Empresa B"
              />
            </div>
            <Button type="submit" disabled={criar.isPending || !nome.trim()}>
              <Plus className="mr-2 h-4 w-4" /> Criar empresa
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Somente a CEO consegue criar empresas. Cada empresa começa vazia e isolada das demais.
          </p>
        </CardContent>
      </Card>

      <DialogoEditar empresa={editando} aoFechar={() => setEditando(null)} />
      <DialogoExcluir empresa={excluindo} aoFechar={() => setExcluindo(null)} />
    </div>
  );
}

function DialogoEditar({ empresa, aoFechar }: { empresa: Tenant | null; aoFechar: () => void }) {
  const renomear = useRenomearTenant();
  const [nome, setNome] = useState("");

  return (
    <Dialog
      open={!!empresa}
      onOpenChange={(aberto) => {
        if (!aberto) aoFechar();
        else setNome(empresa?.nome ?? "");
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar empresa</DialogTitle>
          <DialogDescription>
            O identificador ({empresa?.slug}) não muda, para preservar links e dados existentes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="editar-nome">Nome da empresa</Label>
          <Input
            id="editar-nome"
            value={nome || (empresa?.nome ?? "")}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button
            disabled={renomear.isPending}
            onClick={() => {
              if (!empresa) return;
              renomear.mutate(
                { tenantId: empresa.id, nome: nome || empresa.nome },
                {
                  onSuccess: () => {
                    toast.success("Empresa atualizada.");
                    setNome("");
                    aoFechar();
                  },
                  onError: (erro) =>
                    toast.error(erro instanceof Error ? erro.message : "Falha ao salvar."),
                },
              );
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoExcluir({ empresa, aoFechar }: { empresa: Tenant | null; aoFechar: () => void }) {
  const { data: atual } = useTenantAtual();
  const { data: dependencias = [], isPending } = useDependenciasTenant(empresa?.id);
  const excluir = useExcluirTenant();
  const [confirmacao, setConfirmacao] = useState("");
  const [etapa, setEtapa] = useState(1);

  const ativa = !!empresa && empresa.id === atual?.id;
  const habilitada = !!empresa && empresa.ativo && empresa.status === "ativo";
  const bloqueadores = dependencias.filter((d) => d.bloqueia && Number(d.total) > 0);
  const podeExcluir =
    !!empresa &&
    !ativa &&
    !habilitada &&
    bloqueadores.length === 0 &&
    confirmacao.trim().toLowerCase() === empresa.nome.toLowerCase();

  return (
    <Dialog
      open={!!empresa}
      onOpenChange={(aberto) => {
        if (!aberto) {
          setConfirmacao("");
          setEtapa(1);
          aoFechar();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">Excluir empresa</DialogTitle>
          <DialogDescription>
            ATENÇÃO: a exclusão da empresa pode afetar os dados vinculados a ela. A opção recomendada
            é <strong>Inativar empresa</strong>, que preserva tudo e pode ser revertida.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p>
            Empresa: <strong>{empresa?.nome}</strong> ({empresa?.slug})
          </p>
          {ativa && (
            <p className="rounded-md bg-destructive/10 p-3 text-destructive">
              Esta é a empresa ativa da sua sessão. Entre em outra empresa antes de excluir.
            </p>
          )}
          {habilitada && (
            <p className="rounded-md bg-destructive/10 p-3 text-destructive">
              Esta empresa está ATIVA. Só é possível excluir empresas inativas — use “Inativar
              empresa” antes.
            </p>
          )}
          {isPending ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="rounded-md border border-border/70 p-3">
              <p className="mb-2 font-medium">Dados vinculados</p>
              <ul className="grid gap-1 sm:grid-cols-2">
                {dependencias.map((d) => (
                  <li key={d.entidade} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{d.entidade}</span>
                    <span>{Number(d.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {bloqueadores.length > 0 && (
            <p className="rounded-md bg-destructive/10 p-3 text-destructive">
              Exclusão bloqueada: existem registros vinculados a esta empresa. Nada será apagado — use
              “Inativar empresa”.
            </p>
          )}
          {etapa === 2 && !ativa && bloqueadores.length === 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="confirmar-nome">Digite o nome da empresa para confirmar</Label>
              <Input
                id="confirmar-nome"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                placeholder={empresa?.nome}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar}>
            Cancelar
          </Button>
          {etapa === 1 ? (
            <Button
              variant="destructive"
              disabled={ativa || habilitada || bloqueadores.length > 0 || isPending}
              onClick={() => setEtapa(2)}
            >
              Continuar com a exclusão
            </Button>
          ) : (
            <Button
              variant="destructive"
              disabled={!podeExcluir || excluir.isPending}
              onClick={() => {
                if (!empresa) return;
                excluir.mutate(
                  { tenantId: empresa.id, confirmacao },
                  {
                    onSuccess: () => {
                      toast.success("Empresa excluída.");
                      setConfirmacao("");
                      setEtapa(1);
                      aoFechar();
                    },
                    onError: (erro) =>
                      toast.error(
                        erro instanceof Error ? erro.message : "Não foi possível excluir a empresa.",
                      ),
                  },
                );
              }}
            >
              Excluir definitivamente
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
