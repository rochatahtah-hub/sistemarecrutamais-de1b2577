import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ListChecks, Search } from "lucide-react";

import { FichaAtendimento } from "@/components/atendimento/FichaAtendimento";
import { PageHeader } from "@/components/PageHeader";
import { RequerPermissao } from "@/components/RequerPermissao";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useDebounce } from "@/hooks/use-debounce";
import {
  STATUS_VALIDACAO_LABEL,
  useConferencias,
  type RegistroAtendimento,
  type StatusValidacao,
} from "@/lib/atendimento";
import { fmtData } from "@/lib/metricas";
import { usePrivacidade } from "@/lib/privacidade";
import { formatarCPF, soDigitos, useProgramadoras } from "@/lib/programacao";
import { STATUS_LABEL, type StatusVaga } from "@/lib/tipos";

export const Route = createFileRoute("/atendimento")({
  head: () => ({
    meta: [
      { title: "Atendimento | Recruta+" },
      {
        name: "description",
        content:
          "Confira jornada, valores e divergências das fichas antes de liberar para pagamento.",
      },
    ],
  }),
  component: Pagina,
});

const CORES_VALIDACAO: Record<StatusValidacao, string> = {
  PENDENTE: "border-amber-500/40 bg-amber-500/10 text-amber-500",
  VALIDADO: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
  DIVERGENCIA: "border-destructive/40 bg-destructive/10 text-destructive",
  HISTORICO_NAO_AVALIADO: "border-border bg-muted text-muted-foreground",
};

function Pagina() {
  return (
    <RequerPermissao modulo="atendimento" area="Atendimento">
      <Conteudo />
    </RequerPermissao>
  );
}

function Conteudo() {
  const priv = usePrivacidade();
  const { data: registros = [], isPending } = useConferencias();
  const { data: programadoras = [] } = useProgramadoras();

  const [empresa, setEmpresa] = useState("todas");
  const [statusOperacional, setStatusOperacional] = useState("todos");
  const [statusValidacao, setStatusValidacao] = useState("todos");
  const [programador, setProgramador] = useState("todos");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [busca, setBusca] = useState("");
  const buscaLenta = useDebounce(busca, 300);
  const [selecionado, setSelecionado] = useState<RegistroAtendimento | null>(null);

  const empresas = useMemo(
    () => Array.from(new Set(registros.map((r) => r.empresa))).sort((a, b) => a.localeCompare(b)),
    [registros],
  );

  const filtrados = useMemo(() => {
    const termo = buscaLenta.trim().toLowerCase();
    const digitos = soDigitos(buscaLenta);
    return registros.filter((r) => {
      if (empresa !== "todas" && r.empresa !== empresa) return false;
      if (statusOperacional !== "todos" && r.status_vaga !== statusOperacional) return false;
      if (statusValidacao !== "todos" && r.conferencia.status_validacao !== statusValidacao)
        return false;
      if (programador !== "todos" && r.programadora_id !== programador) return false;
      if (de && r.data < de) return false;
      if (ate && r.data > ate) return false;
      if (!termo) return true;
      return (
        r.nome.toLowerCase().includes(termo) ||
        (digitos.length >= 3 && soDigitos(r.cpf).includes(digitos))
      );
    });
  }, [registros, empresa, statusOperacional, statusValidacao, programador, de, ate, buscaLenta]);

  const porEmpresa = useMemo(() => {
    const mapa = new Map<string, RegistroAtendimento[]>();
    for (const r of filtrados) {
      const lista = mapa.get(r.empresa) ?? [];
      lista.push(r);
      mapa.set(r.empresa, lista);
    }
    return Array.from(mapa.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtrados]);

  const totais = useMemo(
    () => ({
      total: filtrados.length,
      pendentes: filtrados.filter((r) => r.conferencia.status_validacao === "PENDENTE").length,
      validadas: filtrados.filter((r) => r.conferencia.status_validacao === "VALIDADO").length,
      divergencias: filtrados.filter((r) => r.conferencia.status_validacao === "DIVERGENCIA")
        .length,
    }),
    [filtrados],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Atendimento"
        icone={<ListChecks className="h-5 w-5" />}
        descricao="Banco de conferência operacional: confira jornada, valores e divergências antes de liberar para a Parede de Pagamentos."
      />

      <Card>
        <CardHeader>
          <CardTitle>Conferência operacional</CardTitle>
          <CardDescription>
            Total: {totais.total} · 🟡 Pendentes: {totais.pendentes} · 🟢 Validadas:{" "}
            {totais.validadas} · 🔴 Divergências: {totais.divergencias}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="at-empresa">Empresa</Label>
            <Select value={empresa} onValueChange={setEmpresa}>
              <SelectTrigger id="at-empresa">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as empresas</SelectItem>
                {empresas.map((e) => (
                  <SelectItem key={e} value={e}>
                    {priv.privado ? priv.empresa(e) : e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="at-programador">Programador</Label>
            <Select value={programador} onValueChange={setProgramador}>
              <SelectTrigger id="at-programador">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {programadoras.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="at-status-op">Situação da vaga</Label>
            <Select value={statusOperacional} onValueChange={setStatusOperacional}>
              <SelectTrigger id="at-status-op">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {(["PRESENCA", "FALTA", "CANCELAMENTO"] as StatusVaga[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="at-status-val">Status de validação</Label>
            <Select value={statusValidacao} onValueChange={setStatusValidacao}>
              <SelectTrigger id="at-status-val">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {(Object.keys(STATUS_VALIDACAO_LABEL) as StatusValidacao[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_VALIDACAO_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="at-de">Data inicial</Label>
            <Input id="at-de" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="at-ate">Data final</Label>
            <Input id="at-ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="at-busca">Nome ou CPF</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="at-busca"
                className="pl-9"
                value={busca}
                placeholder="Buscar..."
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isPending && <p className="text-sm text-muted-foreground">Carregando fichas…</p>}

      {!isPending && porEmpresa.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma ficha por aqui. Assim que uma vaga tiver presença, falta ou cancelamento
            registrado, ela aparece para conferência.
          </CardContent>
        </Card>
      )}

      {porEmpresa.map(([nomeEmpresa, linhas]) => (
        <Card key={nomeEmpresa}>
          <CardHeader>
            <CardTitle>{priv.privado ? priv.empresa(nomeEmpresa) : nomeEmpresa}</CardTitle>
            <CardDescription>
              {linhas.length} {linhas.length === 1 ? "ficha" : "fichas"}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Validação</TableHead>
                  <TableHead>Total estimado</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((r) => (
                  <TableRow
                    key={r.vaga_id}
                    className="cursor-pointer"
                    onClick={() => setSelecionado(r)}
                  >
                    <TableCell className="font-medium">{priv.nome(r.nome)}</TableCell>
                    <TableCell>{priv.privado ? priv.cpf(r.cpf) : formatarCPF(r.cpf)}</TableCell>
                    <TableCell>{fmtData(r.data)}</TableCell>
                    <TableCell>{STATUS_LABEL[r.status_vaga] ?? r.status_vaga}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={CORES_VALIDACAO[r.conferencia.status_validacao]}
                      >
                        {STATUS_VALIDACAO_LABEL[r.conferencia.status_validacao]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.conferencia.total_estimado != null
                        ? r.conferencia.total_estimado.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      Abrir ficha →
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      <FichaAtendimento
        registro={selecionado}
        aberto={selecionado !== null}
        onFechar={() => setSelecionado(null)}
      />
    </div>
  );
}
