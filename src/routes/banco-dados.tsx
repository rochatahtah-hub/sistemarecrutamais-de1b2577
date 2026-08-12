import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Archive,
  CloudUpload,
  Database,
  Download,
  ExternalLink,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { RequerPermissao } from "@/components/RequerPermissao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/use-debounce";
import { usePermissoes } from "@/lib/permissoes";
import { ENTIDADES, entidadePorChave, type CampoEntidade } from "@/lib/banco-entidades";
import {
  arquivarRegistro,
  atualizarRegistro,
  auditoriaBanco,
  excluirRegistro,
  listarRegistros,
  panoramaBanco,
} from "@/lib/banco.functions";
import { enviarBackupDrive, statusDrive } from "@/lib/drive.functions";
import { gerarBackup, linkDownloadBackup } from "@/lib/backup.functions";

export const Route = createFileRoute("/banco-dados")({
  head: () => ({
    meta: [
      { title: "Banco de Dados | RECRUTA+" },
      {
        name: "description",
        content:
          "Área administrativa do banco de dados do RECRUTA+: volumes, tabelas, pesquisa, auditoria, backups e cópia para o Google Drive.",
      },
      { property: "og:title", content: "Banco de Dados | RECRUTA+" },
      {
        property: "og:description",
        content: "Administre os dados oficiais do RECRUTA+ com segurança, auditoria e backups.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequerPermissao modulo="banco_dados" area="Banco de Dados">
      <Pagina />
    </RequerPermissao>
  ),
});

function fmtData(valor: unknown) {
  if (!valor) return "—";
  const d = new Date(String(valor));
  if (Number.isNaN(d.getTime())) return String(valor);
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function fmtTamanho(bytes: number) {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`;
}

function valorCampo(campo: CampoEntidade, valor: unknown) {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (campo.tipo === "booleano") return valor ? "Sim" : "Não";
  if (campo.tipo === "data") return fmtData(valor);
  return String(valor);
}

function Panorama() {
  const carregar = useServerFn(panoramaBanco);
  const drive = useServerFn(statusDrive);
  const panorama = useQuery({ queryKey: ["banco-panorama"], queryFn: () => carregar(), refetchInterval: 60_000 });
  const conta = useQuery({ queryKey: ["drive-status"], queryFn: () => drive() });

  if (panorama.isLoading) return <Skeleton className="h-64 w-full" />;
  if (panorama.isError || !panorama.data) {
    return <p className="text-sm text-destructive">Não foi possível consultar o banco de dados.</p>;
  }
  const d = panorama.data;

  return (
    <div className="space-y-4">
      <div className="surface-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 text-primary" />
          <div>
            <p className="font-display text-sm font-semibold text-emerald-500">🟢 Banco de dados operando normalmente</p>
            <p className="text-xs text-muted-foreground">
              Fonte oficial dos dados · Última atualização: {fmtData(d.ultimaAtualizacao)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{d.totalEntidades} entidades</Badge>
          <Badge variant="outline">{d.totalRegistros.toLocaleString("pt-BR")} registros</Badge>
          <Badge variant={conta.data?.conectado ? "default" : "outline"}>
            Google Drive: {conta.data?.conectado ? conta.data.conta || "conectado" : "não conectado"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {d.entidades.map((e) => (
          <div key={e.chave} className="surface-panel rounded-2xl p-4">
            <p className="text-xs text-muted-foreground">{e.nome}</p>
            <p className="font-display text-2xl font-bold">{e.total.toLocaleString("pt-BR")}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="surface-panel rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Último backup</p>
          <p className="text-sm font-semibold">{fmtData(d.ultimoBackup?.created_at)}</p>
          <p className="text-xs text-muted-foreground">
            {d.ultimoBackup?.arquivo_nome ?? "Nenhum backup gerado"}
          </p>
        </div>
        <div className="surface-panel rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Último envio ao Google Drive</p>
          <p className="text-sm font-semibold">{fmtData(d.ultimoBackupDrive?.drive_em)}</p>
          <p className="text-xs text-muted-foreground">
            {d.ultimoBackupDrive?.arquivo_nome ?? "Nenhum backup enviado ao Drive"}
          </p>
        </div>
        <div className="surface-panel rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Armazenamento de backups</p>
          <p className="text-sm font-semibold">{fmtTamanho(d.armazenamentoBackups)}</p>
          <p className="text-xs text-muted-foreground">Arquivos guardados com segurança</p>
        </div>
      </div>

      <div className="surface-panel space-y-2 rounded-2xl p-4">
        <h3 className="font-display text-sm font-semibold">Últimos registros atualizados</h3>
        {d.ultimosRegistros.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum registro no banco ainda.</p>
        )}
        {(d.ultimosRegistros as Array<Record<string, unknown>>).map((r) => (
          <div key={String(r.id)} className="flex flex-wrap justify-between gap-2 border-b border-border pb-2 text-xs">
            <span>
              {r.data} · {r.cargo || "Sem cargo"} · <strong>{r.status}</strong>
            </span>
            <span className="text-muted-foreground">{fmtData(r.updated_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tabelas() {
  const { pode } = usePermissoes();
  const [chave, setChave] = useState(ENTIDADES[0]!.chave);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [pagina, setPagina] = useState(0);
  const termo = useDebounce(busca, 350);
  const ent = entidadePorChave(chave)!;

  const listar = useServerFn(listarRegistros);
  const atualizar = useServerFn(atualizarRegistro);
  const arquivar = useServerFn(arquivarRegistro);
  const excluir = useServerFn(excluirRegistro);
  const qc = useQueryClient();

  const consulta = useQuery({
    queryKey: ["banco-registros", chave, termo, status, pagina],
    queryFn: () => listar({ data: { entidade: chave, busca: termo, status, pagina } }),
  });

  const [edicao, setEdicao] = useState<Record<string, unknown> | null>(null);
  const [remover, setRemover] = useState<Record<string, unknown> | null>(null);
  const [confirmacao, setConfirmacao] = useState("");

  const invalidar = () => {
    void qc.invalidateQueries({ queryKey: ["banco-registros"] });
    void qc.invalidateQueries({ queryKey: ["banco-auditoria"] });
    void qc.invalidateQueries({ queryKey: ["banco-panorama"] });
  };

  const mSalvar = useMutation({
    mutationFn: (campos: Record<string, unknown>) =>
      atualizar({ data: { entidade: chave, id: String(edicao?.["id"]), campos } }),
    onSuccess: () => {
      toast.success("Registro atualizado e alteração registrada na auditoria.");
      setEdicao(null);
      invalidar();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const mArquivar = useMutation({
    mutationFn: ({ id, valor }: { id: string; valor: boolean }) =>
      arquivar({ data: { entidade: chave, id, arquivar: valor } }),
    onSuccess: () => {
      toast.success("Situação do registro atualizada.");
      invalidar();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const mExcluir = useMutation({
    mutationFn: () => excluir({ data: { entidade: chave, id: String(remover?.["id"]), confirmacao } }),
    onSuccess: () => {
      toast.success("Registro excluído definitivamente.");
      setRemover(null);
      setConfirmacao("");
      invalidar();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const linhas = consulta.data?.linhas ?? [];
  const total = consulta.data?.total ?? 0;
  const porPagina = consulta.data?.porPagina ?? 25;
  const podeEditar = pode("banco_dados", "editar");
  const podeExcluir = pode("banco_dados", "excluir");
  const podeExportar = pode("banco_dados", "exportar");

  const exportar = () => {
    const colunas = ent.campos.map((c) => c.chave);
    const csv = [
      colunas.map((c) => `"${ent.campos.find((x) => x.chave === c)?.rotulo ?? c}"`).join(";"),
      ...linhas.map((l) => colunas.map((c) => `"${String(l[c] ?? "").replace(/"/g, '""')}"`).join(";")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `recruta_plus_${ent.chave}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const arquivado = (linha: Record<string, unknown>) =>
    ent.arquivar ? linha[ent.arquivar.coluna] === ent.arquivar.inativo : false;

  return (
    <div className="space-y-4">
      <div className="surface-panel grid gap-3 rounded-2xl p-4 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)_auto]">
        <Select
          value={chave}
          onValueChange={(v) => {
            setChave(v);
            setPagina(0);
            setStatus("");
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTIDADES.map((e) => (
              <SelectItem key={e.chave} value={e.chave}>
                {e.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(0);
            }}
            placeholder={`Pesquisar em ${ent.nome.toLowerCase()}`}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {ent.filtroStatus && (
            <Select
              value={status || "todos"}
              onValueChange={(v) => {
                setStatus(v === "todos" ? "" : v);
                setPagina(0);
              }}
            >
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {ent.filtroStatus.opcoes.map((o) => (
                  <SelectItem key={o.valor} value={o.valor}>
                    {o.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={() => void consulta.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
          </Button>
          {podeExportar && (
            <Button variant="outline" size="sm" onClick={exportar} disabled={!linhas.length}>
              <Download className="mr-2 h-4 w-4" /> Exportar
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {ent.descricao} · {total.toLocaleString("pt-BR")} registros
        {ent.somenteLeitura && " · entidade somente leitura (histórico protegido)"}
      </p>

      <div className="surface-panel overflow-x-auto rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              {ent.campos.map((c) => (
                <TableHead key={c.chave}>{c.rotulo}</TableHead>
              ))}
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {consulta.isLoading && (
              <TableRow>
                <TableCell colSpan={ent.campos.length + 1}>
                  <Skeleton className="h-24 w-full" />
                </TableCell>
              </TableRow>
            )}
            {linhas.map((linha) => (
              <TableRow key={String(linha["id"])} className={arquivado(linha) ? "opacity-60" : ""}>
                {ent.campos.map((c) => (
                  <TableCell key={c.chave} className="max-w-[260px] truncate text-xs">
                    {valorCampo(c, linha[c.chave])}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {podeEditar && !ent.somenteLeitura && (
                      <Button size="icon" variant="ghost" onClick={() => setEdicao(linha)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {podeEditar && ent.arquivar && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title={arquivado(linha) ? "Reativar" : "Arquivar / desativar"}
                        onClick={() =>
                          mArquivar.mutate({ id: String(linha["id"]), valor: !arquivado(linha) })
                        }
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
                    {podeExcluir && !ent.somenteLeitura && !ent.protegida && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        title="Excluir definitivamente"
                        onClick={() => {
                          setRemover(linha);
                          setConfirmacao("");
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!consulta.isLoading && linhas.length === 0 && (
              <TableRow>
                <TableCell colSpan={ent.campos.length + 1} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Página {pagina + 1} de {Math.max(1, Math.ceil(total / porPagina))}
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>
            Anterior
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={(pagina + 1) * porPagina >= total}
            onClick={() => setPagina((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>

      <DialogoEdicao
        entidadeNome={ent.nome}
        campos={ent.campos.filter((c) => c.editavel)}
        registro={edicao}
        salvando={mSalvar.isPending}
        onFechar={() => setEdicao(null)}
        onSalvar={(campos) => mSalvar.mutate(campos)}
      />

      <Dialog open={Boolean(remover)} onOpenChange={(o) => !o && setRemover(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tem certeza que deseja excluir este registro?</DialogTitle>
            <DialogDescription>
              A exclusão é definitiva e ficará registrada na auditoria. Se o registro tiver histórico
              vinculado, prefira arquivar. Digite <strong>EXCLUIR</strong> para confirmar.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            placeholder="EXCLUIR"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemover(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={confirmacao.trim().toUpperCase() !== "EXCLUIR" || mExcluir.isPending}
              onClick={() => mExcluir.mutate()}
            >
              {mExcluir.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DialogoEdicao({
  entidadeNome,
  campos,
  registro,
  salvando,
  onFechar,
  onSalvar,
}: {
  entidadeNome: string;
  campos: CampoEntidade[];
  registro: Record<string, unknown> | null;
  salvando: boolean;
  onFechar: () => void;
  onSalvar: (campos: Record<string, unknown>) => void;
}) {
  const [valores, setValores] = useState<Record<string, unknown>>({});
  const atual = useMemo(() => ({ ...(registro ?? {}), ...valores }), [registro, valores]);

  return (
    <Dialog
      open={Boolean(registro)}
      onOpenChange={(o) => {
        if (!o) {
          setValores({});
          onFechar();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar registro · {entidadeNome}</DialogTitle>
          <DialogDescription>
            As alterações ficam registradas no histórico com usuário, campo, valor anterior e novo valor.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {campos.map((c) => (
            <div key={c.chave} className="space-y-1.5">
              <Label htmlFor={`campo-${c.chave}`}>{c.rotulo}</Label>
              {c.tipo === "booleano" ? (
                <Switch
                  id={`campo-${c.chave}`}
                  checked={Boolean(atual[c.chave])}
                  onCheckedChange={(v) => setValores((s) => ({ ...s, [c.chave]: v }))}
                />
              ) : (
                <Input
                  id={`campo-${c.chave}`}
                  type={c.tipo === "numero" ? "number" : "text"}
                  value={String(atual[c.chave] ?? "")}
                  onChange={(e) =>
                    setValores((s) => ({
                      ...s,
                      [c.chave]: c.tipo === "numero" ? Number(e.target.value) : e.target.value,
                    }))
                  }
                />
              )}
            </div>
          ))}
          {campos.length === 0 && (
            <p className="text-sm text-muted-foreground">Esta entidade não possui campos editáveis.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            disabled={salvando || Object.keys(valores).length === 0}
            onClick={() => {
              onSalvar(valores);
              setValores({});
            }}
          >
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HistoricoAlteracoes() {
  const carregar = useServerFn(auditoriaBanco);
  const { data = [], isLoading } = useQuery({
    queryKey: ["banco-auditoria"],
    queryFn: () => carregar({ data: {} }),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="surface-panel space-y-2 rounded-2xl p-4">
      {data.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma alteração registrada ainda.</p>}
      {data.map((l) => (
        <div key={String(l["id"])} className="border-b border-border pb-2 text-xs">
          <p className="font-medium">
            {fmtData(l["created_at"])} — {String(l["usuario_nome"] ?? "Sistema")}
          </p>
          <p className="text-muted-foreground">
            {String(l["acao"])} em <strong>{String(l["tabela"])}</strong>
            {l["descricao"] ? ` · ${String(l["descricao"])}` : ""}
            {l["campo"] ? ` · campo ${String(l["campo"])}: "${String(l["valor_anterior"] ?? "")}" → "${String(l["valor_novo"] ?? "")}"` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

interface BackupLinha {
  id: string;
  created_at: string;
  arquivo_nome: string;
  formato: string;
  origem: string;
  status: string;
  tamanho_bytes: number;
  criado_por_nome: string;
  drive_status: string;
  drive_link: string;
  drive_em: string | null;
  drive_erro: string;
}

function Backups() {
  const qc = useQueryClient();
  const { pode } = usePermissoes();
  const gerar = useServerFn(gerarBackup);
  const baixar = useServerFn(linkDownloadBackup);
  const enviarDrive = useServerFn(enviarBackupDrive);
  const drive = useServerFn(statusDrive);

  const conta = useQuery({ queryKey: ["drive-status"], queryFn: () => drive() });
  const historico = useQuery({
    queryKey: ["backups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backups")
        .select(
          "id,created_at,arquivo_nome,formato,origem,status,tamanho_bytes,criado_por_nome,drive_status,drive_link,drive_em,drive_erro",
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as BackupLinha[];
    },
  });

  const mGerar = useMutation({
    mutationFn: () => gerar({ data: { formato: "sql", enviarEmail: false } }),
    onSuccess: (r) => {
      toast.success(`Backup completo criado: ${r.nome}`);
      void qc.invalidateQueries({ queryKey: ["backups"] });
      void qc.invalidateQueries({ queryKey: ["banco-panorama"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const mBaixar = useMutation({
    mutationFn: (id: string) => baixar({ data: { id } }),
    onSuccess: (r) => window.open(r.url, "_blank", "noopener"),
    onError: (e) => toast.error((e as Error).message),
  });

  const mDrive = useMutation({
    mutationFn: ({ id, forcar }: { id: string; forcar: boolean }) =>
      enviarDrive({ data: { id, forcar } }),
    onSuccess: (r) => {
      toast.success(r.jaEnviado ? "Backup já enviado ao Google Drive." : "Backup copiado para o Google Drive.");
      void qc.invalidateQueries({ queryKey: ["backups"] });
      void qc.invalidateQueries({ queryKey: ["banco-panorama"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const podeCriar = pode("banco_dados", "criar");

  return (
    <div className="space-y-4">
      <div className="surface-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
        <div>
          <p className="font-display text-sm font-semibold">Backup completo do Recruta+</p>
          <p className="text-xs text-muted-foreground">
            Inclui todas as entidades operacionais e históricos, sem senhas, tokens ou credenciais.
            {conta.data?.conectado
              ? ` Google Drive conectado${conta.data.conta ? ` (${conta.data.conta})` : ""} · pasta "Recruta+ — Backups".`
              : " Google Drive ainda não conectado."}
          </p>
        </div>
        {podeCriar && (
          <Button onClick={() => mGerar.mutate()} disabled={mGerar.isPending}>
            {mGerar.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Database className="mr-2 h-4 w-4" />
            )}
            Criar backup agora
          </Button>
        )}
      </div>

      <div className="surface-panel overflow-x-auto rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Arquivo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Criado por</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Google Drive</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(historico.data ?? []).map((b) => (
              <TableRow key={b.id}>
                <TableCell className="text-xs">{fmtData(b.created_at)}</TableCell>
                <TableCell className="max-w-[220px] truncate text-xs">{b.arquivo_nome || "—"}</TableCell>
                <TableCell className="text-xs uppercase">{b.formato} · {b.origem}</TableCell>
                <TableCell className="text-xs">{b.criado_por_nome || "Sistema"}</TableCell>
                <TableCell className="text-xs">{fmtTamanho(b.tamanho_bytes)}</TableCell>
                <TableCell className="text-xs">
                  <Badge variant={b.status === "concluido" ? "outline" : "secondary"}>{b.status}</Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {b.drive_status === "enviado" ? (
                    <span className="flex items-center gap-1 text-emerald-500">
                      Enviado {b.drive_em ? `· ${fmtData(b.drive_em)}` : ""}
                      {b.drive_link && (
                        <a href={b.drive_link} target="_blank" rel="noopener noreferrer" title="Abrir no Drive">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </span>
                  ) : b.drive_status === "erro" ? (
                    <span className="text-destructive">Falha no envio</span>
                  ) : (
                    <span className="text-muted-foreground">Não enviado</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" title="Baixar" onClick={() => mBaixar.mutate(b.id)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    {podeCriar && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title={
                          b.drive_status === "enviado"
                            ? "Enviar nova cópia ao Google Drive"
                            : "Copiar para o Google Drive"
                        }
                        disabled={mDrive.isPending || b.status !== "concluido"}
                        onClick={() => mDrive.mutate({ id: b.id, forcar: b.drive_status === "enviado" })}
                      >
                        <CloudUpload className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {historico.data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum backup gerado ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Pagina() {
  return (
    <div className="space-y-5">
      <PageHeader
        titulo="🗄️ Banco de Dados"
        descricao="O banco de dados é a fonte oficial do Recruta+. Consulte, pesquise, corrija e faça backups com segurança."
      />
      <Tabs defaultValue="panorama">
        <TabsList className="flex w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="panorama">📊 Panorama</TabsTrigger>
          <TabsTrigger value="tabelas">📁 Tabelas e pesquisa</TabsTrigger>
          <TabsTrigger value="auditoria">🕘 Histórico de alterações</TabsTrigger>
          <TabsTrigger value="backups">💾 Backups</TabsTrigger>
        </TabsList>
        <TabsContent value="panorama" className="pt-4">
          <Panorama />
        </TabsContent>
        <TabsContent value="tabelas" className="pt-4">
          <Tabelas />
        </TabsContent>
        <TabsContent value="auditoria" className="pt-4">
          <HistoricoAlteracoes />
        </TabsContent>
        <TabsContent value="backups" className="pt-4">
          <Backups />
        </TabsContent>
      </Tabs>
    </div>
  );
}
