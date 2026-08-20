import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Banknote, Search } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { RequerPermissao } from "@/components/RequerPermissao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { usePermissoes } from "@/lib/permissoes";
import { usePrivacidade } from "@/lib/privacidade";
import { formatarCPF, formatarTelefone, soDigitos } from "@/lib/programacao";
import { fmtData } from "@/lib/metricas";
import {
  STATUS_PAGAMENTO_EDITAVEIS,
  STATUS_PAGAMENTO_LABEL,
  usePagamentos,
  useSalvarPagamento,
  type RegistroPagamento,
  type StatusPagamento,
} from "@/lib/pagamentos";

export const Route = createFileRoute("/pagamentos")({
  head: () => ({
    meta: [
      { title: "Pagamentos de Diárias | Recruta+" },
      {
        name: "description",
        content:
          "Controle os pagamentos das diárias com presença confirmada, separados por empresa e com status de pagamento.",
      },
      { property: "og:title", content: "Pagamentos de Diárias | Recruta+" },
      {
        property: "og:description",
        content: "Fila de pagamentos por empresa, com Pix da ficha e registro de quem pagou.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pagina,
});

const CORES: Record<StatusPagamento, string> = {
  AGUARDANDO: "border-amber-500/40 bg-amber-500/10 text-amber-500",
  PAGO: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
  PROBLEMA: "border-destructive/40 bg-destructive/10 text-destructive",
  BLOQUEADO: "border-border bg-muted text-muted-foreground",
};

function Pagina() {
  return (
    <RequerPermissao modulo="pagamentos" area="Pagamentos">
      <Conteudo />
    </RequerPermissao>
  );
}

function Conteudo() {
  const priv = usePrivacidade();
  const { pode } = usePermissoes();
  const podeEditar = pode("pagamentos", "editar");
  const { data: registros = [], isPending } = usePagamentos();
  const salvar = useSalvarPagamento();

  const [empresa, setEmpresa] = useState("todas");
  const [status, setStatus] = useState("todos");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [busca, setBusca] = useState("");
  const buscaLenta = useDebounce(busca, 300);

  const empresas = useMemo(
    () => Array.from(new Set(registros.map((r) => r.empresa))).sort((a, b) => a.localeCompare(b)),
    [registros],
  );

  const filtrados = useMemo(() => {
    const termo = buscaLenta.trim().toLowerCase();
    const digitos = soDigitos(buscaLenta);
    return registros.filter((r) => {
      if (empresa !== "todas" && r.empresa !== empresa) return false;
      if (status !== "todos" && r.status !== status) return false;
      if (de && r.data < de) return false;
      if (ate && r.data > ate) return false;
      if (!termo) return true;
      return (
        r.nome.toLowerCase().includes(termo) ||
        r.pix.toLowerCase().includes(termo) ||
        (digitos.length >= 3 &&
          (soDigitos(r.cpf).includes(digitos) || soDigitos(r.telefone).includes(digitos)))
      );
    });
  }, [registros, empresa, status, de, ate, buscaLenta]);

  const porEmpresa = useMemo(() => {
    const mapa = new Map<string, RegistroPagamento[]>();
    for (const r of filtrados) {
      const lista = mapa.get(r.empresa) ?? [];
      lista.push(r);
      mapa.set(r.empresa, lista);
    }
    return Array.from(mapa.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtrados]);

  const totais = useMemo(
    () => ({
      aguardando: filtrados.filter((r) => r.status === "AGUARDANDO").length,
      pago: filtrados.filter((r) => r.status === "PAGO").length,
      problema: filtrados.filter((r) => r.status === "PROBLEMA").length,
      bloqueado: filtrados.filter((r) => r.status === "BLOQUEADO").length,
    }),
    [filtrados],
  );

  function alterar(registro: RegistroPagamento, novo: StatusPagamento) {
    if (registro.status === "PAGO" && novo === "PAGO") {
      toast.warning("Este pagamento já está registrado como pago.");
      return;
    }
    salvar.mutate(
      {
        vagaId: registro.vaga_id,
        status: novo,
        observacao: registro.observacao,
        statusAtual: registro.status,
      },
      {
        onSuccess: () => toast.success(`Situação atualizada: ${STATUS_PAGAMENTO_LABEL[novo]}.`),
        onError: (e) => toast.error((e as Error).message),
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Pagamentos"
        icone={<Banknote className="h-5 w-5" />}
        descricao="Colaboradores com presença confirmada entram automaticamente na fila de pagamento, com os dados da ficha."
      />

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Aguardando: {totais.aguardando} · Pagos: {totais.pago} · Com problema: {totais.problema}{" "}
            · Bloqueados: {totais.bloqueado}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor="pg-empresa">Empresa</Label>
            <Select value={empresa} onValueChange={setEmpresa}>
              <SelectTrigger id="pg-empresa">
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
            <Label htmlFor="pg-status">Situação</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="pg-status">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as situações</SelectItem>
                {(Object.keys(STATUS_PAGAMENTO_LABEL) as StatusPagamento[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_PAGAMENTO_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pg-de">Data inicial</Label>
            <Input id="pg-de" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pg-ate">Data final</Label>
            <Input id="pg-ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pg-busca">Nome, CPF, telefone ou Pix</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="pg-busca"
                className="pl-9"
                value={busca}
                placeholder="Buscar..."
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isPending && <p className="text-sm text-muted-foreground">Carregando pagamentos…</p>}

      {!isPending && porEmpresa.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum pagamento na fila. Assim que uma programação for marcada como presença, ela
            aparece aqui.
          </CardContent>
        </Card>
      )}

      {porEmpresa.map(([nomeEmpresa, linhas]) => (
        <Card key={nomeEmpresa}>
          <CardHeader>
            <CardTitle>{priv.privado ? priv.empresa(nomeEmpresa) : nomeEmpresa}</CardTitle>
            <CardDescription>
              {linhas.length} {linhas.length === 1 ? "colaborador" : "colaboradores"} na fila
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Chave Pix</TableHead>
                  <TableHead>Data do trabalho</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Registro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((r) => (
                  <TableRow key={r.vaga_id}>
                    <TableCell className="font-medium">{priv.nome(r.nome)}</TableCell>
                    <TableCell>{priv.privado ? priv.cpf(r.cpf) : formatarCPF(r.cpf)}</TableCell>
                    <TableCell>
                      {r.telefone
                        ? priv.privado
                          ? priv.telefone(r.telefone)
                          : formatarTelefone(r.telefone)
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-[220px] break-all">
                      {r.pix ? (priv.privado ? priv.texto(r.pix) : r.pix) : "Não informada"}
                    </TableCell>
                    <TableCell>{fmtData(r.data)}</TableCell>
                    <TableCell>
                      {podeEditar && r.status !== "BLOQUEADO" ? (
                        <Select
                          value={r.status}
                          onValueChange={(v) => alterar(r, v as StatusPagamento)}
                        >
                          <SelectTrigger
                            className="w-[210px]"
                            aria-label={`Situação do pagamento de ${r.nome}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_PAGAMENTO_EDITAVEIS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {STATUS_PAGAMENTO_LABEL[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className={CORES[r.status]}>
                          {STATUS_PAGAMENTO_LABEL[r.status]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.status === "PAGO" && r.pago_em
                        ? `${new Date(r.pago_em).toLocaleString("pt-BR")}${
                            r.pago_por_nome ? ` · ${priv.nome(r.pago_por_nome)}` : ""
                          }`
                        : r.status === "BLOQUEADO"
                          ? "Presença revertida"
                          : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!podeEditar && (
              <p className="mt-3 text-xs text-muted-foreground">
                Você tem acesso somente de consulta nesta área.
              </p>
            )}
            <div className="sr-only">
              <Button type="button" tabIndex={-1} aria-hidden>
                atualizar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
