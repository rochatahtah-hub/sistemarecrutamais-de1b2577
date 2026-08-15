import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Globe2, KeyRound, Pencil, Plus, Search, ShieldOff, Unlock } from "lucide-react";
import { toast } from "sonner";

import { RequerPermissao } from "@/components/RequerPermissao";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/lib/auth";
import { usePermissoes } from "@/lib/permissoes";
import { formatarCPF, soDigitos, useCandidatos, useEmpresas } from "@/lib/programacao";
import { usePrivacidade } from "@/lib/privacidade";
import { alterarPin } from "@/lib/pin.functions";
import {
  TIPO_ROTULO,
  useBloqueados,
  useDesbloquearColaborador,
  useSalvarBloqueio,
  type Bloqueio,
  type FiltroBloqueios,
  type TipoBloqueio,
} from "@/lib/bloqueios";

export const Route = createFileRoute("/bloqueios")({
  head: () => ({
    meta: [
      { title: "Bloqueio de Colaboradores | Recruta+" },
      {
        name: "description",
        content:
          "Bloqueie colaboradores por CPF para uma empresa específica ou para todas as empresas do Recruta+.",
      },
      { property: "og:title", content: "Bloqueio de Colaboradores | Recruta+" },
      {
        property: "og:description",
        content:
          "Bloqueie colaboradores por CPF para uma empresa específica ou para todas as empresas do Recruta+.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaProtegida,
});

const VAZIO = {
  id: undefined as string | undefined,
  cpf: "",
  nome: "",
  telefone: "",
  motivo: "",
  tipo_bloqueio: "EMPRESA_ESPECIFICA" as TipoBloqueio,
  empresa_id: "",
  ativo: true,
};

function Pagina() {
  const { isAdmin } = useAuth();
  const { pode } = usePermissoes();
  const priv = usePrivacidade();
  const { data: empresas = [] } = useEmpresas();
  const empresasAtivas = useMemo(() => empresas.filter((e) => e.ativo), [empresas]);

  const podeCriar = pode("bloqueios", "criar");
  const podeEditar = pode("bloqueios", "editar");
  const podeExcluir = pode("bloqueios", "excluir");

  const [filtros, setFiltros] = useState<FiltroBloqueios>({ status: "ativos" });
  const [busca, setBusca] = useState("");
  const termo = useDebounce(busca, 350);
  const consulta = useMemo(() => ({ ...filtros, busca: termo }), [filtros, termo]);
  const { data: lista = [], isLoading } = useBloqueados(consulta);

  const salvar = useSalvarBloqueio();
  const desbloquear = useDesbloquearColaborador();
  const [form, setForm] = useState<typeof VAZIO | null>(null);
  const [alvoDesbloqueio, setAlvoDesbloqueio] = useState<Bloqueio | null>(null);

  // Busca de colaborador no formulário
  const [buscaColab, setBuscaColab] = useState("");
  const termoColab = useDebounce(buscaColab, 350);
  const { data: candidatos = [] } = useCandidatos(termoColab, Boolean(form) && termoColab.length > 2);

  const trocarPin = useServerFn(alterarPin);
  const [novoPin, setNovoPin] = useState("");

  function abrirNovo() {
    setBuscaColab("");
    setForm({ ...VAZIO });
  }

  function abrirEdicao(b: Bloqueio) {
    setBuscaColab("");
    setForm({
      id: b.id,
      cpf: formatarCPF(b.cpf),
      nome: b.nome,
      telefone: b.telefone,
      motivo: b.motivo,
      tipo_bloqueio: b.tipo_bloqueio,
      empresa_id: b.empresa_id ?? "",
      ativo: b.ativo,
    });
  }

  async function confirmarSalvar() {
    if (!form) return;
    try {
      await salvar.mutateAsync({
        id: form.id,
        cpf: form.cpf,
        nome: form.nome,
        telefone: form.telefone,
        motivo: form.motivo,
        tipo_bloqueio: form.tipo_bloqueio,
        empresa_id: form.tipo_bloqueio === "EMPRESA_ESPECIFICA" ? form.empresa_id : null,
        ativo: form.ativo,
      });
      toast.success(form.id ? "Bloqueio atualizado." : "Colaborador bloqueado.");
      setForm(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function confirmarDesbloqueio() {
    if (!alvoDesbloqueio) return;
    try {
      await desbloquear.mutateAsync(alvoDesbloqueio.id);
      toast.success("Bloqueio removido com sucesso.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAlvoDesbloqueio(null);
    }
  }

  async function salvarPin() {
    try {
      await trocarPin({ data: { novo: novoPin } });
      setNovoPin("");
      toast.success("PIN administrativo atualizado.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Bloqueio de colaboradores</h1>
          <p className="text-sm text-muted-foreground">
            O CPF é o identificador principal. O bloqueio pode valer para uma empresa específica ou
            para todas as empresas.
          </p>
        </div>
        {podeCriar && (
          <Button onClick={abrirNovo}>
            <Plus className="mr-2 h-4 w-4" /> Bloquear colaborador
          </Button>
        )}
      </div>

      <div className="surface-panel grid gap-3 rounded-2xl p-4 md:grid-cols-6">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Nome ou CPF"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select
          value={filtros.empresaId ?? "todas"}
          onValueChange={(v) => setFiltros((f) => ({ ...f, empresaId: v === "todas" ? "" : v }))}
        >
          <SelectTrigger><SelectValue placeholder="Empresa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as empresas</SelectItem>
            {empresas.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filtros.tipo || "todos"}
          onValueChange={(v) =>
            setFiltros((f) => ({ ...f, tipo: v === "todos" ? "" : (v as TipoBloqueio) }))
          }
        >
          <SelectTrigger><SelectValue placeholder="Abrangência" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Toda abrangência</SelectItem>
            <SelectItem value="EMPRESA_ESPECIFICA">Empresa específica</SelectItem>
            <SelectItem value="TODAS_EMPRESAS">Todas as empresas</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filtros.status ?? "ativos"}
          onValueChange={(v) => setFiltros((f) => ({ ...f, status: v as FiltroBloqueios["status"] }))}
        >
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ativos">Ativos</SelectItem>
            <SelectItem value="inativos">Inativos</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            value={filtros.de ?? ""}
            onChange={(e) => setFiltros((f) => ({ ...f, de: e.target.value }))}
          />
          <Input
            type="date"
            value={filtros.ate ?? ""}
            onChange={(e) => setFiltros((f) => ({ ...f, ate: e.target.value }))}
          />
        </div>
      </div>

      <div className="surface-panel space-y-3 rounded-2xl p-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Abrangência</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Bloqueado por</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.nome ? priv.nome(b.nome) : "—"}</TableCell>
                  <TableCell>{priv.privado ? priv.cpf(b.cpf) : formatarCPF(b.cpf)}</TableCell>
                  <TableCell>
                    <Badge variant={b.tipo_bloqueio === "TODAS_EMPRESAS" ? "destructive" : "secondary"}>
                      {b.tipo_bloqueio === "TODAS_EMPRESAS" ? (
                        <Globe2 className="mr-1 h-3 w-3" />
                      ) : (
                        <Building2 className="mr-1 h-3 w-3" />
                      )}
                      {TIPO_ROTULO[b.tipo_bloqueio]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {b.tipo_bloqueio === "TODAS_EMPRESAS" ? "TODAS" : b.empresa_nome || "—"}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate">
                    {priv.privado ? priv.texto(b.motivo) : b.motivo || "—"}
                  </TableCell>
                  <TableCell>{new Date(b.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{b.bloqueado_por_nome ? priv.nome(b.bloqueado_por_nome) : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={b.ativo ? "default" : "outline"}>
                      {b.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {podeEditar && (
                      <Button variant="outline" size="sm" className="mr-2" onClick={() => abrirEdicao(b)}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                      </Button>
                    )}
                    {b.ativo && podeExcluir && (
                      <Button variant="outline" size="sm" onClick={() => setAlvoDesbloqueio(b)}>
                        <Unlock className="mr-2 h-4 w-4" /> Desbloquear
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && lista.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    Nenhum bloqueio encontrado com os filtros atuais.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {isAdmin && (
        <div className="surface-panel space-y-3 rounded-2xl p-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <KeyRound className="h-4 w-4 text-primary" /> PIN administrativo
          </h2>
          <p className="text-sm text-muted-foreground">
            O PIN fica guardado de forma cifrada e nunca é exibido. Após 5 tentativas incorretas o
            acesso fica bloqueado por 15 minutos.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="novo-pin">Novo PIN (4 a 8 dígitos)</Label>
              <Input
                id="novo-pin"
                type="password"
                inputMode="numeric"
                maxLength={8}
                className="w-48"
                value={novoPin}
                onChange={(e) => setNovoPin(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <Button variant="outline" disabled={novoPin.length < 4} onClick={() => void salvarPin()}>
              Alterar PIN
            </Button>
          </div>
        </div>
      )}

      <Dialog open={Boolean(form)} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar bloqueio" : "Bloquear colaborador"}</DialogTitle>
          </DialogHeader>

          {form && (
            <div className="space-y-4">
              {!form.id && (
                <div className="space-y-1.5">
                  <Label htmlFor="bq-busca">Buscar colaborador (nome ou CPF)</Label>
                  <Input
                    id="bq-busca"
                    value={buscaColab}
                    onChange={(e) => setBuscaColab(e.target.value)}
                    placeholder="Digite ao menos 3 caracteres"
                  />
                  {candidatos.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-lg border">
                      {candidatos.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() =>
                            setForm((s) =>
                              s
                                ? {
                                    ...s,
                                    cpf: formatarCPF(c.cpf),
                                    nome: c.nome,
                                    telefone: c.telefone ?? "",
                                  }
                                : s,
                            )
                          }
                        >
                          <span>{priv.nome(c.nome)}</span>
                          <span className="text-xs text-muted-foreground">
                            {priv.privado ? priv.cpf(c.cpf) : formatarCPF(c.cpf)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="bq-nome">Nome</Label>
                  <Input
                    id="bq-nome"
                    value={form.nome}
                    onChange={(e) => setForm((s) => (s ? { ...s, nome: e.target.value } : s))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bq-cpf">CPF</Label>
                  <Input
                    id="bq-cpf"
                    inputMode="numeric"
                    value={form.cpf}
                    disabled={Boolean(form.id)}
                    onChange={(e) => setForm((s) => (s ? { ...s, cpf: formatarCPF(e.target.value) } : s))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Abrangência do bloqueio</Label>
                <RadioGroup
                  value={form.tipo_bloqueio}
                  onValueChange={(v) =>
                    setForm((s) => (s ? { ...s, tipo_bloqueio: v as TipoBloqueio } : s))
                  }
                  className="gap-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="EMPRESA_ESPECIFICA" id="ab-empresa" />
                    <Label htmlFor="ab-empresa" className="font-normal">Empresa específica</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="TODAS_EMPRESAS" id="ab-todas" />
                    <Label htmlFor="ab-todas" className="font-normal">Todas as empresas</Label>
                  </div>
                </RadioGroup>
              </div>

              {form.tipo_bloqueio === "EMPRESA_ESPECIFICA" && (
                <div className="space-y-1.5">
                  <Label>Selecione a empresa</Label>
                  <Select
                    value={form.empresa_id}
                    onValueChange={(v) => setForm((s) => (s ? { ...s, empresa_id: v } : s))}
                  >
                    <SelectTrigger><SelectValue placeholder="Empresa" /></SelectTrigger>
                    <SelectContent>
                      {empresasAtivas.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="bq-motivo">Motivo do bloqueio</Label>
                <Textarea
                  id="bq-motivo"
                  rows={3}
                  maxLength={500}
                  placeholder="Informe o motivo do bloqueio"
                  value={form.motivo}
                  onChange={(e) => setForm((s) => (s ? { ...s, motivo: e.target.value } : s))}
                />
              </div>

              {form.id && (
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={form.ativo ? "ativo" : "inativo"}
                    onValueChange={(v) => setForm((s) => (s ? { ...s, ativo: v === "ativo" } : s))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button
              disabled={salvar.isPending || soDigitos(form?.cpf ?? "").length !== 11 || !(form?.motivo ?? "").trim()}
              onClick={() => void confirmarSalvar()}
            >
              <ShieldOff className="mr-2 h-4 w-4" />
              {salvar.isPending ? "Salvando..." : form?.id ? "Salvar alterações" : "Bloquear colaborador"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(alvoDesbloqueio)} onOpenChange={(o) => !o && setAlvoDesbloqueio(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja realmente desbloquear este colaborador?</AlertDialogTitle>
            <AlertDialogDescription>
              O bloqueio ficará inativo e o histórico permanece disponível para auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmarDesbloqueio()}>Desbloquear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PaginaProtegida() {
  return (
    <RequerPermissao modulo="bloqueios" area="Bloqueio de Colaboradores">
      <Pagina />
    </RequerPermissao>
  );
}
