import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { History, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ACAO_LABEL, TABELA_LABEL, useAuditoria } from "@/lib/auditoria";
import { fmtNum } from "@/lib/metricas";

export const Route = createFileRoute("/auditoria")({
  head: () => ({
    meta: [
      { title: "Histórico de Alterações | RECRUTA+" },
      {
        name: "description",
        content:
          "Rastreie quem alterou cada registro, quando e quais informações mudaram no RECRUTA+.",
      },
      { property: "og:title", content: "Histórico de Alterações | RECRUTA+" },
      {
        property: "og:description",
        content: "Rastreabilidade completa das alterações de vagas, candidatos e empresas.",
      },
    ],
  }),
  component: Pagina,
});

const CAMPO_LABEL: Record<string, string> = {
  status: "Confirmação",
  situacao: "Situação",
  cargo: "Cargo",
  horario: "Horário",
  local: "Local",
  responsavel: "Responsável",
  quantidade: "Quantidade",
  observacao: "Observação",
  nome: "Nome",
  cpf: "CPF",
  telefone: "Telefone",
  data: "Data",
};

function Pagina() {
  const { data: registros = [], isLoading, isError, refetch } = useAuditoria();
  const [busca, setBusca] = useState("");
  const [tabela, setTabela] = useState("TODAS");
  const [acao, setAcao] = useState("TODAS");
  const [pagina, setPagina] = useState(0);
  const porPagina = 50;

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return registros.filter((r) => {
      if (tabela !== "TODAS" && r.tabela !== tabela) return false;
      if (acao !== "TODAS" && r.acao !== acao) return false;
      if (!termo) return true;
      return [r.descricao, r.usuario_nome, r.campo, r.valor_anterior, r.valor_novo]
        .join(" ")
        .toLowerCase()
        .includes(termo);
    });
  }, [registros, busca, tabela, acao]);

  const visiveis = filtrados.slice(pagina * porPagina, pagina * porPagina + porPagina);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <History className="h-6 w-6 text-primary" />
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold">Histórico de alterações</h1>
          <p className="text-sm text-muted-foreground">
            Quem alterou, quando, qual registro e o que mudou — informação anterior e nova.
          </p>
        </div>
      </div>

      <div className="surface-panel grid gap-3 rounded-xl p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="relative min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por registro, usuário ou valor..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(0);
            }}
          />
        </div>
        <Select
          value={tabela}
          onValueChange={(v) => {
            setTabela(v);
            setPagina(0);
          }}
        >
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODAS">Todos os módulos</SelectItem>
            {Object.entries(TABELA_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={acao}
          onValueChange={(v) => {
            setAcao(v);
            setPagina(0);
          }}
        >
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODAS">Todas as ações</SelectItem>
            {Object.entries(ACAO_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError && (
        <div className="surface-panel rounded-xl p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar o histórico. Tente novamente.
          </p>
          <Button className="mt-3" variant="outline" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      <div className="surface-panel overflow-x-auto rounded-xl p-2">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40">
              <TableHead className="whitespace-nowrap">Data / hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Registro alterado</TableHead>
              <TableHead>Campo</TableHead>
              <TableHead>Informação anterior</TableHead>
              <TableHead>Informação nova</TableHead>
              <TableHead>Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Carregando histórico...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && visiveis.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Nenhuma alteração registrada para estes filtros.
                </TableCell>
              </TableRow>
            )}
            {visiveis.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("pt-BR")}
                </TableCell>
                <TableCell>{r.usuario_nome || "Sistema"}</TableCell>
                <TableCell>
                  <span className="font-medium">{TABELA_LABEL[r.tabela] ?? r.tabela}</span>
                  {r.descricao ? ` · ${r.descricao}` : ""}
                </TableCell>
                <TableCell>{r.campo ? (CAMPO_LABEL[r.campo] ?? r.campo) : "—"}</TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">
                  {r.valor_anterior || "—"}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">{r.valor_novo || "—"}</TableCell>
                <TableCell>
                  <Badge variant={r.acao === "DELETE" ? "destructive" : "outline"}>
                    {ACAO_LABEL[r.acao] ?? r.acao}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          {fmtNum(filtrados.length)} alteração(ões) registradas
        </span>
        {totalPaginas > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagina === 0}
              onClick={() => setPagina((p) => p - 1)}
            >
              Anterior
            </Button>
            <span className="text-muted-foreground">
              Página {pagina + 1} de {totalPaginas}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagina >= totalPaginas - 1}
              onClick={() => setPagina((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
