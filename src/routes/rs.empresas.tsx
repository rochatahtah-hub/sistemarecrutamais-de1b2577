import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { EstadoVazio } from "@/components/EstadoVazio";
import { RequerPermissao } from "@/components/RequerPermissao";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { usePermissoes } from "@/lib/permissoes";
import {
  diasDePermanencia,
  media,
  permanenciaTexto,
  useCandidatosCLT,
  useEmpresasCLT,
  useSalvarEmpresaCLT,
  type EmpresaCLT,
} from "@/lib/rs";

export const Route = createFileRoute("/rs/empresas")({
  head: () => ({
    meta: [
      { title: "Empresas CLT | Recruta+" },
      {
        name: "description",
        content:
          "Cadastro independente das empresas usadas nos processos de recrutamento e seleção CLT, com indicadores por empresa.",
      },
      { property: "og:title", content: "Empresas CLT | Recruta+" },
      {
        property: "og:description",
        content: "Empresas do módulo CLT com admissões, ativos, desligamentos e permanência média.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaProtegida,
});

const VAZIA = { nome: "", contato: "", cidade: "", observacao: "", ativo: true };

function Pagina() {
  const { pode } = usePermissoes();
  const { data: empresas = [], isLoading } = useEmpresasCLT();
  const { data: candidatos = [] } = useCandidatosCLT();
  const salvar = useSalvarEmpresaCLT();

  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<Partial<EmpresaCLT> & { nome: string }>(VAZIA);
  const [detalheId, setDetalheId] = useState<string | null>(null);

  const indicadores = useMemo(() => {
    const mapa = new Map<
      string,
      { total: number; ativos: number; desligados: number; cargos: Set<string>; dias: number[] }
    >();
    for (const c of candidatos) {
      if (!c.empresa_id) continue;
      const atual =
        mapa.get(c.empresa_id) ??
        { total: 0, ativos: 0, desligados: 0, cargos: new Set<string>(), dias: [] };
      atual.total += 1;
      if (c.status === "ativo") atual.ativos += 1;
      else atual.desligados += 1;
      if (c.cargo) atual.cargos.add(c.cargo);
      const d = diasDePermanencia(c);
      if (d !== null) atual.dias.push(d);
      mapa.set(c.empresa_id, atual);
    }
    return mapa;
  }, [candidatos]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return empresas.filter((e) => !termo || `${e.nome} ${e.cidade}`.toLowerCase().includes(termo));
  }, [empresas, busca]);

  const detalhe = empresas.find((e) => e.id === detalheId) ?? null;
  const vinculados = candidatos.filter((c) => c.empresa_id === detalheId);

  const enviar = () =>
    salvar.mutate(form, {
      onSuccess: () => {
        toast.success(form.id ? "Empresa atualizada." : "Empresa CLT cadastrada.");
        setAberto(false);
      },
      onError: (e: Error) => toast.error(e.message),
    });

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Empresas CLT"
        descricao="Cadastro exclusivo das empresas usadas nos processos de recrutamento e seleção CLT."
        icone={<Building2 className="h-5 w-5" />}
        acoes={
          pode("rs_empresas", "criar") && (
            <Button
              onClick={() => {
                setForm(VAZIA);
                setAberto(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Nova empresa
            </Button>
          )
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar empresa"
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando empresas…</p>
      ) : lista.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma empresa CLT cadastrada"
          descricao="Cadastre as empresas que participam dos processos seletivos CLT."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Candidatos</TableHead>
                  <TableHead>Ativos</TableHead>
                  <TableHead>Desligados</TableHead>
                  <TableHead>Permanência média</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((e) => {
                  const i = indicadores.get(e.id);
                  return (
                    <TableRow key={e.id} className="cursor-pointer" onClick={() => setDetalheId(e.id)}>
                      <TableCell>
                        <p className="font-medium">{e.nome}</p>
                        <p className="text-xs text-muted-foreground">{e.cidade || "Sem cidade"}</p>
                      </TableCell>
                      <TableCell>{e.cidade || "—"}</TableCell>
                      <TableCell>{i?.total ?? 0}</TableCell>
                      <TableCell>{i?.ativos ?? 0}</TableCell>
                      <TableCell>{i?.desligados ?? 0}</TableCell>
                      <TableCell>{permanenciaTexto(i?.dias.length ? media(i.dias) : null)}</TableCell>
                      <TableCell className="text-right">
                        {pode("rs_empresas", "editar") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Editar"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setForm(e);
                              setAberto(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar empresa CLT" : "Nova empresa CLT"}</DialogTitle>
            <DialogDescription>Cadastro independente das empresas da operação de diárias.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="e-nome">Nome</Label>
              <Input id="e-nome" value={form.nome} onChange={(ev) => setForm({ ...form, nome: ev.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="e-cidade">Cidade</Label>
              <Input id="e-cidade" value={form.cidade ?? ""} onChange={(ev) => setForm({ ...form, cidade: ev.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="e-contato">Contato</Label>
              <Input id="e-contato" value={form.contato ?? ""} onChange={(ev) => setForm({ ...form, contato: ev.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="e-obs">Observação</Label>
              <Textarea id="e-obs" value={form.observacao ?? ""} onChange={(ev) => setForm({ ...form, observacao: ev.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button onClick={enviar} disabled={salvar.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detalheId} onOpenChange={(v) => !v && setDetalheId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{detalhe?.nome}</DialogTitle>
            <DialogDescription>Candidatos e cargos vinculados a esta empresa CLT.</DialogDescription>
          </DialogHeader>
          {vinculados.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum candidato vinculado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidato</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Permanência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vinculados.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.nome}</TableCell>
                    <TableCell>{c.cargo || "—"}</TableCell>
                    <TableCell>{c.status === "ativo" ? "Ativo" : "Desligado"}</TableCell>
                    <TableCell>{permanenciaTexto(diasDePermanencia(c))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaginaProtegida() {
  return (
    <RequerPermissao modulo="rs_empresas" area="Empresas CLT">
      <Pagina />
    </RequerPermissao>
  );
}
