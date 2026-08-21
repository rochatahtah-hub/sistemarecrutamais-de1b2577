import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Database, Download, Eye, Link2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { EstadoVazio } from "@/components/EstadoVazio";
import { BotaoWhatsApp } from "@/components/BotaoWhatsApp";
import { FormularioColaborador } from "@/components/diarias/FormularioColaborador";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { usePrivacidade } from "@/lib/privacidade";
import { usePermissoes } from "@/lib/permissoes";
import { RequerPermissao } from "@/components/RequerPermissao";
import {
  PERIODOS,
  STATUS_COLABORADOR,
  STATUS_ROTULO,
  formatarTelefone,
  useAtualizarColaboradorDiaria,
  useColaboradoresDiaria,
  useCpfCompleto,
  useExcluirColaboradorDiaria,
  type ColaboradorDiaria,
  type StatusColaborador,
} from "@/lib/diarias";
import { rotuloTransporte } from "@/lib/programacao";
import { useTenantAtual } from "@/lib/tenant";
import { caminhoPortalDiarias, linkPortalDiarias } from "@/lib/portal-url";
import { celulaCsv } from "@/lib/csv-seguro";

/** Resumo do transporte exibido diretamente na listagem (sem entrar em edição). */
function ResumoTransporte({ colaborador }: { colaborador: ColaboradorDiaria }) {
  const tipos = (colaborador.transporte_tipos ?? []).map(rotuloTransporte);
  return (
    <div className="space-y-1 text-xs">
      <div>
        <span className="text-muted-foreground">Próprio: </span>
        <span className="font-medium">{colaborador.transporte_proprio ? "Sim" : "Não"}</span>
      </div>
      {colaborador.transporte_proprio && (
        <div>
          <span className="text-muted-foreground">Tipo: </span>
          <span className="font-medium">{tipos.length ? tipos.join(", ") : "—"}</span>
        </div>
      )}
      <div>
        <span className="text-muted-foreground">Fretado: </span>
        <span className="font-medium">{colaborador.precisa_fretado ? "Sim" : "Não"}</span>
      </div>
      {colaborador.transporte_observacao ? (
        <p className="text-muted-foreground">Obs.: {colaborador.transporte_observacao}</p>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/banco-colaboradores")({
  head: () => ({
    meta: [
      { title: "Banco de Colaboradores | Recruta+" },
      {
        name: "description",
        content: "Base de colaboradores cadastrados no portal público de diárias, com filtros e status.",
      },
      { property: "og:title", content: "Banco de Colaboradores | Recruta+" },
      {
        property: "og:description",
        content: "Consulte, filtre e atualize o status dos colaboradores disponíveis para diárias.",
      },
    ],
  }),
  component: () => (
    <RequerPermissao modulo="banco_colaboradores" area="Banco de Colaboradores">
      <Pagina />
    </RequerPermissao>
  ),
});

function Pagina() {
  const priv = usePrivacidade();
  const { pode } = usePermissoes();
  const [busca, setBusca] = useState("");
  const [cidade, setCidade] = useState("");
  const [status, setStatus] = useState("todos");
  const [periodo, setPeriodo] = useState("todos");
  const [disponivel, setDisponivel] = useState<"todos" | "sim" | "nao">("todos");
  const buscaDebounce = useDebounce(busca, 350);
  const cidadeDebounce = useDebounce(cidade, 350);

  const filtros = useMemo(
    () => ({
      busca: buscaDebounce,
      cidade: cidadeDebounce,
      status,
      disponivel,
      periodo: periodo === "todos" ? "" : periodo,
    }),
    [buscaDebounce, cidadeDebounce, status, disponivel, periodo],
  );

  const { data: lista = [], isLoading } = useColaboradoresDiaria(filtros);
  const atualizar = useAtualizarColaboradorDiaria();
  const excluir = useExcluirColaboradorDiaria();
  const [cpfVisivel, setCpfVisivel] = useState<string | null>(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState<ColaboradorDiaria | null>(null);
  const { data: cpfCompleto } = useCpfCompleto(cpfVisivel);

  const { data: empresaAtiva } = useTenantAtual();
  // O link leva o identificador da empresa: o cadastro cai sempre na empresa certa.
  const slugPortal = empresaAtiva?.slug ?? "";
  const caminhoPortal = slugPortal ? caminhoPortalDiarias(slugPortal) : "";
  const linkPortal = slugPortal ? linkPortalDiarias(slugPortal) : "";

  function exportar() {
    const linhas = [
      ["Nome", "Telefone", "CPF", "Cidade", "Bairro", "Disponível", "Períodos", "Função", "Transporte próprio", "Tipos de transporte", "Precisa de fretado", "Obs. transporte", "Status", "Cadastro"],
      ...lista.map((c) => [
        c.full_name,
        formatarTelefone(c.phone),
        c.cpf_mascara || "—",
        c.city,

        c.neighborhood,
        c.available_for_daily ? "Sim" : "Não",
        c.available_periods.join(" | "),
        c.desired_role,
        c.transporte_proprio ? "Sim" : "Não",
        (c.transporte_tipos ?? []).join(" | "),
        c.precisa_fretado ? "Sim" : "Não",
        c.transporte_observacao ?? "",
        STATUS_ROTULO[c.status as StatusColaborador] ?? c.status,
        new Date(c.created_at).toLocaleDateString("pt-BR"),
      ]),
    ];
    const csv = linhas.map((l) => l.map((v) => celulaCsv(v)).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `banco-colaboradores-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Banco de Colaboradores"
        descricao="Cadastros recebidos pelo portal público de diárias."
        icone={<Database className="h-5 w-5" />}
        acoes={
          <>
            {pode("banco_colaboradores", "criar") && (
              <Button
                onClick={() => {
                  setColaboradorSelecionado(null);
                  setFormularioAberto(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar colaborador
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                if (!linkPortal) return;
                void navigator.clipboard?.writeText(linkPortal);
                toast.success("Link do portal copiado.");
              }}
              disabled={!slugPortal}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copiar link do portal
            </Button>
            <Button variant="outline" asChild disabled={!slugPortal}>
              <a href={caminhoPortal} target="_blank" rel="noreferrer">
                <Link2 className="mr-2 h-4 w-4" />
                Abrir portal
              </a>
            </Button>
            {pode("banco_colaboradores", "exportar") && (
              <Button onClick={exportar} disabled={!lista.length}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            )}
          </>
        }
      />

      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-3 xl:grid-cols-5">
          <Input placeholder="Buscar nome, telefone ou bairro" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <Input placeholder="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {STATUS_COLABORADOR.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_ROTULO[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={disponivel} onValueChange={(v) => setDisponivel(v as "todos" | "sim" | "nao")}>
            <SelectTrigger><SelectValue placeholder="Disponibilidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Disponibilidade: todas</SelectItem>
              <SelectItem value="sim">Disponível para diária</SelectItem>
              <SelectItem value="nao">Indisponível</SelectItem>
            </SelectContent>
          </Select>
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger><SelectValue placeholder="Período" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Qualquer período</SelectItem>
              {PERIODOS.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : lista.length === 0 ? (
        <EstadoVazio
          icone={<Users className="h-6 w-6" />}
          titulo="Nenhum colaborador encontrado"
          descricao="Compartilhe o link do portal público para começar a receber cadastros."
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Cidade / Bairro</TableHead>
                  <TableHead>Disponibilidade</TableHead>
                  <TableHead>Transporte</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{priv.nome(c.full_name)}</TableCell>
                    <TableCell>
                      {priv.privado ? (
                        "•••••"
                      ) : (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                          {formatarTelefone(c.phone)}
                          <BotaoWhatsApp telefone={c.phone} nome={c.full_name} />
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {priv.privado ? (
                        "•••••"
                      ) : cpfVisivel === c.id && cpfCompleto ? (
                        <span className="font-medium text-foreground">{cpfCompleto}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          {c.cpf_mascara || "—"}
                          {c.cpf_mascara && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              title="Ver CPF completo (somente administradores)"
                              onClick={() => setCpfVisivel(c.id)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.city} / {c.neighborhood}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.available_for_daily ? (
                          <Badge variant="outline">Disponível</Badge>
                        ) : (
                          <Badge variant="secondary">Indisponível</Badge>
                        )}
                        {c.available_periods.length > 0 && (
                          <span className="text-xs text-muted-foreground">{c.available_periods.join(", ")}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ResumoTransporte colaborador={c} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.desired_role || "—"}</TableCell>
                    <TableCell>
                      {pode("banco_colaboradores", "editar") ? (
                        <Select
                          value={c.status}
                          onValueChange={(v) =>
                            atualizar.mutate(
                              { id: c.id, dados: { status: v } },
                              {
                                onSuccess: () => toast.success("Status atualizado."),
                                onError: () => toast.error("Não foi possível atualizar."),
                              },
                            )
                          }
                        >
                          <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUS_COLABORADOR.map((s) => (
                              <SelectItem key={s} value={s}>{STATUS_ROTULO[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline">{STATUS_ROTULO[c.status as StatusColaborador] ?? c.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {pode("banco_colaboradores", "editar") && (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Editar ${c.full_name}`}
                          title="Editar colaborador"
                          onClick={() => {
                            setColaboradorSelecionado(c);
                            setFormularioAberto(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {pode("banco_colaboradores", "excluir") && (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Excluir cadastro"
                          title="Excluir cadastro"
                          onClick={() => {
                            if (!window.confirm(`Excluir o cadastro de ${c.full_name}?`)) return;
                            excluir.mutate(c.id, {
                              onSuccess: () => toast.success("Cadastro excluído."),
                              onError: () => toast.error("Não foi possível excluir."),
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <FormularioColaborador
        aberto={formularioAberto}
        colaborador={colaboradorSelecionado}
        onOpenChange={(aberto) => {
          setFormularioAberto(aberto);
          if (!aberto) setColaboradorSelecionado(null);
        }}
      />
    </div>
  );
}