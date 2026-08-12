import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { IdCard, Pencil, Plus, Search, History } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { CampoCargoRS } from "@/components/CampoCargoRS";
import { GerenciarCargosRS } from "@/components/GerenciarCargosRS";
import { EstadoVazio } from "@/components/EstadoVazio";
import { RequerPermissao } from "@/components/RequerPermissao";
import { Badge } from "@/components/ui/badge";
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
import { formatarCPF } from "@/lib/programacao";
import { usePermissoes } from "@/lib/permissoes";
import {
  CAMPO_ROTULO,
  diasDePermanencia,
  permanenciaTexto,
  useCandidatosCLT,
  useEmpresasCLT,
  useHistoricoCandidatoCLT,
  useSalvarCandidatoCLT,
  useCargosCLT,
  type CandidatoCLT,
  type EntradaCandidatoCLT,
} from "@/lib/rs";

export const Route = createFileRoute("/rs/candidatos")({
  head: () => ({
    meta: [
      { title: "Meus Candidatos CLT | Recruta+" },
      {
        name: "description",
        content:
          "Cadastre e acompanhe candidatos CLT do recrutamento e seleção: empresa, cargo, admissão, status e desligamento.",
      },
      { property: "og:title", content: "Meus Candidatos CLT | Recruta+" },
      {
        property: "og:description",
        content: "Acompanhamento de candidatos CLT com status, admissão e tempo de permanência.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaProtegida,
});

const VAZIO: EntradaCandidatoCLT = {
  nome: "",
  cpf: "",
  telefone: "",
  empresa_id: null,
  cargo: "",
  data_admissao: "",
  status: "ativo",
  data_desligamento: "",
  motivo_desligamento: "",
  recrutador_nome: "",
  observacao: "",
};

function Pagina() {
  const { pode } = usePermissoes();
  const { data: candidatos = [], isLoading } = useCandidatosCLT();
  const { data: empresas = [] } = useEmpresasCLT();
  const salvar = useSalvarCandidatoCLT();

  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [empresa, setEmpresa] = useState("todas");
  const [cargo, setCargo] = useState("todos");
  const [admDe, setAdmDe] = useState("");
  const [admAte, setAdmAte] = useState("");
  const [desDe, setDesDe] = useState("");
  const [desAte, setDesAte] = useState("");

  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<EntradaCandidatoCLT>(VAZIO);
  const [fichaId, setFichaId] = useState<string | null>(null);
  const { data: historico = [] } = useHistoricoCandidatoCLT(fichaId);
  const ficha = candidatos.find((c) => c.id === fichaId) ?? null;

  const { data: cargosCadastrados = [] } = useCargosCLT();
  const cargos = useMemo(
    () =>
      [
        ...new Set([
          ...candidatos.map((c) => c.cargo).filter(Boolean),
          ...cargosCadastrados.filter((c) => c.ativo).map((c) => c.nome),
        ]),
      ].sort(),
    [candidatos, cargosCadastrados],
  );

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return candidatos.filter((c) => {
      if (termo && !`${c.nome} ${c.cpf} ${c.cargo}`.toLowerCase().includes(termo)) return false;
      if (status !== "todos" && c.status !== status) return false;
      if (empresa !== "todas" && c.empresa_id !== empresa) return false;
      if (cargo !== "todos" && c.cargo !== cargo) return false;
      if (admDe && (!c.data_admissao || c.data_admissao < admDe)) return false;
      if (admAte && (!c.data_admissao || c.data_admissao > admAte)) return false;
      if (desDe && (!c.data_desligamento || c.data_desligamento < desDe)) return false;
      if (desAte && (!c.data_desligamento || c.data_desligamento > desAte)) return false;
      return true;
    });
  }, [candidatos, busca, status, empresa, cargo, admDe, admAte, desDe, desAte]);

  const abrirNovo = () => {
    setForm(VAZIO);
    setAberto(true);
  };

  const abrirEdicao = (c: CandidatoCLT) => {
    setForm({
      id: c.id,
      nome: c.nome,
      cpf: c.cpf,
      telefone: c.telefone,
      empresa_id: c.empresa_id,
      cargo: c.cargo,
      data_admissao: c.data_admissao ?? "",
      status: c.status,
      data_desligamento: c.data_desligamento ?? "",
      motivo_desligamento: c.motivo_desligamento,
      recrutador_nome: c.recrutador_nome,
      observacao: c.observacao,
    });
    setAberto(true);
  };

  const enviar = () => {
    salvar.mutate(form, {
      onSuccess: () => {
        toast.success(form.id ? "Candidato atualizado." : "Candidato cadastrado.");
        setAberto(false);
      },
      onError: (e: Error) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Meus Candidatos"
        descricao="Acompanhamento de candidatos CLT do recrutamento e seleção."
        icone={<IdCard className="h-5 w-5" />}
        acoes={
          <div className="flex flex-wrap gap-2">
            <GerenciarCargosRS />
            {pode("rs_candidatos", "criar") && (
              <Button onClick={abrirNovo}>
                <Plus className="mr-2 h-4 w-4" /> Novo candidato
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar nome, CPF ou cargo"
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="desligado">Desligados</SelectItem>
            </SelectContent>
          </Select>
          <Select value={empresa} onValueChange={setEmpresa}>
            <SelectTrigger><SelectValue placeholder="Empresa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as empresas</SelectItem>
              {empresas.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={cargo} onValueChange={setCargo}>
            <SelectTrigger><SelectValue placeholder="Cargo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os cargos</SelectItem>
              {cargos.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Admissão de</Label>
            <Input type="date" value={admDe} onChange={(e) => setAdmDe(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Admissão até</Label>
            <Input type="date" value={admAte} onChange={(e) => setAdmAte(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Desligamento de</Label>
            <Input type="date" value={desDe} onChange={(e) => setDesDe(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Desligamento até</Label>
            <Input type="date" value={desAte} onChange={(e) => setDesAte(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando candidatos…</p>
      ) : lista.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum candidato CLT encontrado"
          descricao="Cadastre um candidato ou ajuste os filtros para ver os resultados."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidato</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Admissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Desligamento</TableHead>
                  <TableHead>Permanência</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <p className="font-medium">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">{formatarCPF(c.cpf)}</p>
                    </TableCell>
                    <TableCell>{c.rs_empresas?.nome ?? "—"}</TableCell>
                    <TableCell>{c.cargo || "—"}</TableCell>
                    <TableCell>{c.data_admissao ? c.data_admissao.split("-").reverse().join("/") : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "ativo" ? "default" : "secondary"}>
                        {c.status === "ativo" ? "Ativo" : "Desligado"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.data_desligamento ? c.data_desligamento.split("-").reverse().join("/") : "—"}
                    </TableCell>
                    <TableCell>{permanenciaTexto(diasDePermanencia(c))}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setFichaId(c.id)} title="Ficha e histórico">
                        <History className="h-4 w-4" />
                      </Button>
                      {pode("rs_candidatos", "editar") && (
                        <Button variant="ghost" size="icon" onClick={() => abrirEdicao(c)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar candidato CLT" : "Novo candidato CLT"}</DialogTitle>
            <DialogDescription>
              Registre os dados do processo seletivo CLT. O tempo de permanência é calculado
              automaticamente pelas datas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="rs-nome">Nome completo</Label>
              <Input id="rs-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rs-cpf">CPF</Label>
              <Input id="rs-cpf" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rs-tel">Telefone</Label>
              <Input id="rs-tel" value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Empresa CLT</Label>
              <Select
                value={form.empresa_id ?? "nenhuma"}
                onValueChange={(v) => setForm({ ...form, empresa_id: v === "nenhuma" ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Sem empresa</SelectItem>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CampoCargoRS value={form.cargo} onChange={(v) => setForm({ ...form, cargo: v })} />
            <div className="grid gap-1.5">
              <Label htmlFor="rs-adm">Data de admissão/início</Label>
              <Input
                id="rs-adm"
                type="date"
                value={form.data_admissao ?? ""}
                onChange={(e) => setForm({ ...form, data_admissao: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    status: v as "ativo" | "desligado",
                    data_desligamento: v === "ativo" ? "" : form.data_desligamento,
                  })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="desligado">Desligado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.status === "desligado" && (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor="rs-des">Data de desligamento (obrigatória)</Label>
                  <Input
                    id="rs-des"
                    type="date"
                    value={form.data_desligamento ?? ""}
                    onChange={(e) => setForm({ ...form, data_desligamento: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="rs-mot">Motivo do desligamento</Label>
                  <Input
                    id="rs-mot"
                    value={form.motivo_desligamento ?? ""}
                    onChange={(e) => setForm({ ...form, motivo_desligamento: e.target.value })}
                  />
                </div>
              </>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="rs-rec">Recrutador</Label>
              <Input
                id="rs-rec"
                value={form.recrutador_nome ?? ""}
                onChange={(e) => setForm({ ...form, recrutador_nome: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="rs-obs">Observação</Label>
              <Textarea
                id="rs-obs"
                value={form.observacao ?? ""}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button onClick={enviar} disabled={salvar.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!fichaId} onOpenChange={(v) => !v && setFichaId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Ficha do candidato CLT</DialogTitle>
            <DialogDescription>{ficha?.nome}</DialogDescription>
          </DialogHeader>
          {ficha && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <p><span className="text-muted-foreground">CPF:</span> {formatarCPF(ficha.cpf)}</p>
                <p><span className="text-muted-foreground">Telefone:</span> {ficha.telefone || "—"}</p>
                <p><span className="text-muted-foreground">Empresa:</span> {ficha.rs_empresas?.nome ?? "—"}</p>
                <p><span className="text-muted-foreground">Cargo:</span> {ficha.cargo || "—"}</p>
                <p><span className="text-muted-foreground">Admissão:</span> {ficha.data_admissao ?? "—"}</p>
                <p><span className="text-muted-foreground">Status:</span> {ficha.status === "ativo" ? "Ativo" : "Desligado"}</p>
                <p><span className="text-muted-foreground">Desligamento:</span> {ficha.data_desligamento ?? "—"}</p>
                <p><span className="text-muted-foreground">Permanência:</span> {permanenciaTexto(diasDePermanencia(ficha))}</p>
              </div>
              <div>
                <p className="mb-2 font-semibold">Histórico</p>
                {historico.length === 0 ? (
                  <p className="text-muted-foreground">Sem registros de alteração.</p>
                ) : (
                  <ul className="space-y-2">
                    {historico.map((h) => (
                      <li key={h.id} className="rounded-lg border border-border/70 p-2">
                        <p className="text-xs text-muted-foreground">
                          {new Date(h.created_at).toLocaleString("pt-BR")} · {h.usuario_nome}
                        </p>
                        <p>
                          {h.acao === "cadastro"
                            ? "Cadastro do candidato"
                            : `${CAMPO_ROTULO[h.campo] ?? h.campo}: ${h.valor_anterior || "—"} → ${h.valor_novo || "—"}`}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaginaProtegida() {
  return (
    <RequerPermissao modulo="rs_candidatos" area="Meus Candidatos (R&S)">
      <Pagina />
    </RequerPermissao>
  );
}
