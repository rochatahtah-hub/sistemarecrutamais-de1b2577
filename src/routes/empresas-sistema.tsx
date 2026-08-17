import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Check, LogIn, Plus } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useTenantAtual, useTenantsDisponiveis, useTrocarTenant } from "@/lib/tenant";

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

  const criar = useMutation({
    mutationFn: async (valor: string) => {
      const { error } = await supabase
        .from("tenants")
        .insert({ nome: valor.trim(), slug: slugificar(valor) });
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

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="🏢 Empresas do sistema"
        descricao="Escolha a empresa em que você está operando. O sistema mostra uma empresa por vez, sem misturar dados."
      />

      {isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {empresas.map((empresa) => {
            const ativa = empresa.id === atual?.id;
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
                    <Badge variant={empresa.ativo && empresa.status === "ativo" ? "gold" : "secondary"}>
                      {empresa.status}
                    </Badge>
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
                </CardContent>
              </Card>
            );
          })}
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
    </div>
  );
}
