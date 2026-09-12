import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Banknote, Building2, Copy, CreditCard, ExternalLink, Users } from "lucide-react";
import { toast } from "sonner";

import { RequerSuperAdmin } from "@/components/RequerSuperAdmin";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listarComercialMaster, salvarPlanoComercial } from "@/lib/comercial.functions";

export const Route = createFileRoute("/comercial-saas")({
  head: () => ({
    meta: [
      { title: "Gestão comercial SaaS | RECRUTA+" },
      {
        name: "description",
        content: "Administração Master de leads, planos, assinaturas e pagamentos do RECRUTA+.",
      },
      { property: "og:title", content: "Gestão comercial SaaS | RECRUTA+" },
      { property: "og:description", content: "Painel comercial exclusivo do Admin Master." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pagina,
});

function dinheiro(valor: number) {
  return (valor / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function Pagina() {
  return (
    <RequerSuperAdmin>
      <Conteudo />
    </RequerSuperAdmin>
  );
}

function Conteudo() {
  const consulta = useServerFn(listarComercialMaster);
  const salvar = useServerFn(salvarPlanoComercial);
  const qc = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["comercial-master"],
    queryFn: () => consulta(),
  });
  if (isPending || !data)
    return <p className="text-sm text-muted-foreground">Carregando gestão comercial...</p>;
  const indicadores = [
    { nome: "Leads", valor: data.leads.length, Icone: Users },
    {
      nome: "Pedidos aprovados",
      valor: data.pedidos.filter((p) => p.status === "aprovado").length,
      Icone: CreditCard,
    },
    {
      nome: "Assinaturas ativas",
      valor: data.assinaturas.filter((a) => a.status === "ativa").length,
      Icone: Building2,
    },
    {
      nome: "Recebido",
      valor: dinheiro(
        data.pagamentos
          .filter((p) => p.status === "approved")
          .reduce((s, p) => s + p.valor_centavos, 0),
      ),
      Icone: Banknote,
    },
  ];
  const linkVenda = typeof window === "undefined" ? "/leads" : `${window.location.origin}/leads`;
  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Gestão comercial SaaS"
        descricao="Leads, planos, pagamentos e assinaturas de novas empresas. A AGIZZE não participa deste fluxo."
      />
      <Card>
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="link-venda">Link público para conhecer, contratar e pagar</Label>
            <Input id="link-venda" readOnly value={linkVenda} />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(linkVenda);
                toast.success("Link de venda copiado.");
              }}
            >
              <Copy />
              Copiar
            </Button>
            <Button asChild type="button">
              <a href="/leads" target="_blank" rel="noreferrer">
                <ExternalLink />
                Abrir
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {indicadores.map(({ nome, valor, Icone }) => (
          <Card key={nome}>
            <CardContent className="flex items-center gap-3 p-5">
              <Icone className="h-5 w-5 text-gold" />
              <div>
                <p className="text-xs text-muted-foreground">{nome}</p>
                <p className="text-xl font-semibold">{valor}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Tabs defaultValue="leads">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="planos">Planos</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
          <TabsTrigger value="assinaturas">Assinaturas</TabsTrigger>
        </TabsList>
        <TabsContent value="leads">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.empresa_nome}</TableCell>
                    <TableCell>{lead.responsavel_nome}</TableCell>
                    <TableCell>
                      {lead.email}
                      <br />
                      <span className="text-xs text-muted-foreground">{lead.telefone}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{lead.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        <TabsContent value="planos">
          <div className="grid gap-4 lg:grid-cols-3">
            {data.planos.map((plano) => (
              <EditorPlano
                key={plano.id}
                plano={plano}
                salvando={false}
                aoSalvar={async (valor) => {
                  try {
                    await salvar({ data: valor });
                    toast.success("Plano atualizado.");
                    await qc.invalidateQueries({ queryKey: ["comercial-master"] });
                    await qc.invalidateQueries({ queryKey: ["planos-publicos"] });
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
                  }
                }}
              />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="pedidos">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referência</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.pedidos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.id.slice(0, 8)}</TableCell>
                    <TableCell>{p.forma_pagamento}</TableCell>
                    <TableCell>{dinheiro(p.valor_centavos)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        <TabsContent value="assinaturas">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Próxima cobrança</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.assinaturas.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.tenant_id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{a.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {a.proxima_cobranca_em
                        ? new Date(a.proxima_cobranca_em).toLocaleDateString("pt-BR")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

type Plano = Awaited<ReturnType<typeof listarComercialMaster>>["planos"][number];
function EditorPlano({
  plano,
  aoSalvar,
}: {
  plano: Plano;
  salvando: boolean;
  aoSalvar: (d: {
    id: string;
    precoMensalCentavos: number;
    publico: boolean;
    ordem: number;
    recursos: string[];
  }) => Promise<void>;
}) {
  const [preco, setPreco] = useState(
    (plano.preco_mensal_centavos / 100).toFixed(2).replace(".", ","),
  );
  const [publico, setPublico] = useState(plano.publico);
  const [recursos, setRecursos] = useState(
    Array.isArray(plano.recursos) ? plano.recursos.join("\n") : "",
  );
  const [enviando, setEnviando] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{plano.nome}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Preço mensal</Label>
          <Input value={preco} inputMode="decimal" onChange={(e) => setPreco(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Recursos (um por linha)</Label>
          <textarea
            className="min-h-28 w-full rounded-lg border border-border bg-card p-3 text-sm text-foreground"
            value={recursos}
            onChange={(e) => setRecursos(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label>Mostrar na página pública</Label>
          <Switch checked={publico} onCheckedChange={setPublico} />
        </div>
        <Button
          className="w-full"
          disabled={enviando}
          onClick={async () => {
            setEnviando(true);
            const centavos = Math.round(Number(preco.replace(".", "").replace(",", ".")) * 100);
            await aoSalvar({
              id: plano.id,
              precoMensalCentavos: centavos,
              publico,
              ordem: plano.ordem,
              recursos: recursos.split("\n"),
            });
            setEnviando(false);
          }}
        >
          {enviando ? "Salvando..." : "Salvar plano"}
        </Button>
      </CardContent>
    </Card>
  );
}
