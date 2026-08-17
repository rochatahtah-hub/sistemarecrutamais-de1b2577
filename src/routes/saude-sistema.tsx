import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { RequerAdmin } from "@/components/RequerAdmin";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, AlertTriangle, CheckCircle2, Database, FileSpreadsheet, FileText, RotateCcw, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { arquivarErrosResolvidos, definirErroResolvido, listarErrosSistema } from "@/lib/system-health";
import { exportarSaudeExcel, exportarSaudePDF } from "@/lib/exportar-saude";

export const Route = createFileRoute("/saude-sistema")({
  head: () => ({
    meta: [
      { title: "Saúde do Sistema | Gestão de Vagas" },
      { name: "description", content: "Diagnósticos técnicos e estabilidade do sistema." },
      { property: "og:title", content: "Saúde do Sistema | Gestão de Vagas" },
      { property: "og:description", content: "Diagnósticos técnicos e estabilidade do sistema." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaProtegida,
});

function Pagina() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<"pendente" | "resolvido">("pendente");
  const [arquivar, setArquivar] = useState<string | "todos" | null>(null);
  const consulta = useQuery({
    queryKey: ["saude-sistema"],
    queryFn: listarErrosSistema,
    enabled: isAdmin,
    refetchInterval: 60_000,
    retry: false,
  });
  const erros = consulta.data ?? [];
  const visiveis = erros.filter((erro) => erro.status === filtro);
  const backup = useQuery({
    queryKey: ["saude-backup"],
    enabled: isAdmin,
    retry: false,
    queryFn: async () => {
      const { data } = await supabase
        .from("backup_agendamento")
        .select("ativo,ultima_execucao,proxima_execucao,ultimo_envio_status,email_destino")
        .eq("id", true)
        .maybeSingle();
      return data ?? null;
    },
  });
  const [exportando, setExportando] = useState<"pdf" | "excel" | null>(null);
  const atualizar = useMutation({
    mutationFn: ({ id, resolvido }: { id: string; resolvido: boolean }) => definirErroResolvido(id, resolvido),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["saude-sistema"] });
      toast.success("Status do diagnóstico atualizado.");
    },
    onError: () => toast.error("Não foi possível atualizar o diagnóstico."),
  });
  const limpar = useMutation({
    mutationFn: (alvo: string | "todos") => arquivarErrosResolvidos(alvo === "todos" ? undefined : alvo),
    onSuccess: async (totalArquivado) => {
      setArquivar(null);
      await qc.invalidateQueries({ queryKey: ["saude-sistema"] });
      toast.success(`${totalArquivado} item(ns) resolvido(s) removido(s) da lista.`);
    },
    onError: () => toast.error("Não foi possível limpar os itens resolvidos."),
  });
  const total = useMemo(() => erros.reduce((soma, erro) => soma + erro.ocorrencias, 0), [erros]);
  const naoAutorizados = useMemo(
    () => erros.filter((erro) => erro.codigo_http === 401).reduce((soma, erro) => soma + erro.ocorrencias, 0),
    [erros],
  );

  async function exportar(formato: "pdf" | "excel") {
    if (erros.length === 0) {
      toast.info("Não há erros registrados para exportar.");
      return;
    }
    setExportando(formato);
    try {
      if (formato === "pdf") await exportarSaudePDF(erros);
      else await exportarSaudeExcel(erros);
      toast.success("Relatório de saúde do sistema gerado.");
    } catch {
      toast.error("Não foi possível gerar o relatório.");
    } finally {
      setExportando(null);
    }
  }

  if (!isAdmin) {
    return (
      <div className="surface-panel p-8 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-3 font-display text-xl font-bold">Área administrativa</h1>
        <p className="mt-1 text-sm text-muted-foreground">Somente administradores podem consultar diagnósticos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Saúde do Sistema</h1>
          <p className="text-sm text-muted-foreground">Falhas agrupadas por origem e atualizadas a cada minuto.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportar("excel")} disabled={exportando !== null}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> {exportando === "excel" ? "Gerando..." : "Excel"}
          </Button>
          <Button size="sm" onClick={() => exportar("pdf")} disabled={exportando !== null}>
            <FileText className="mr-2 h-4 w-4" /> {exportando === "pdf" ? "Gerando..." : "PDF"}
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador icone={Activity} rotulo="Ocorrências" valor={total} />
        <Indicador icone={ShieldAlert} rotulo="Erros 401" valor={naoAutorizados} />
        <Indicador icone={Database} rotulo="Falhas distintas" valor={erros.length} />
      </div>
      <div className="surface-panel p-4">
        <p className="font-display text-sm font-semibold">
          {backup.data?.ativo ? "🟢 Backup automático ativo" : "🔴 Backup automático desativado"}
        </p>
        <p className="text-xs text-muted-foreground">
          Última execução:{" "}
          {backup.data?.ultima_execucao
            ? new Date(backup.data.ultima_execucao).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
            : "—"}{" "}
          · Próxima:{" "}
          {backup.data?.ativo && backup.data.proxima_execucao
            ? new Date(backup.data.proxima_execucao).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
            : "—"}{" "}
          (horário de Brasília) · Envio: {backup.data?.email_destino ?? "—"}
        </p>
      </div>
      <div className="surface-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <div className="flex gap-2">
            <Button size="sm" variant={filtro === "pendente" ? "secondary" : "ghost"} onClick={() => setFiltro("pendente")}>Pendentes</Button>
            <Button size="sm" variant={filtro === "resolvido" ? "secondary" : "ghost"} onClick={() => setFiltro("resolvido")}>Resolvidos</Button>
          </div>
          {filtro === "resolvido" && visiveis.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setArquivar("todos")}>
              <Trash2 className="mr-2 h-4 w-4" /> Limpar itens resolvidos
            </Button>
          )}
        </div>
        {consulta.isPending ? (
          <p className="p-5 text-sm text-muted-foreground">Carregando diagnósticos...</p>
        ) : consulta.isError ? (
          <div className="flex items-center gap-2 p-5 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> Não foi possível consultar os diagnósticos.
          </div>
        ) : visiveis.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Nenhum diagnóstico {filtro}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
                <tr><th className="p-3">Última ocorrência</th><th className="p-3">Origem</th><th className="p-3">Falha</th><th className="p-3">Ambiente</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">Ações</th></tr>
              </thead>
              <tbody>
                {visiveis.map((erro) => (
                  <tr key={erro.id} className="border-b last:border-0">
                    <td className="whitespace-nowrap p-3">{new Date(erro.ultima_ocorrencia).toLocaleString("pt-BR")}</td>
                    <td className="p-3"><p className="font-medium">{erro.componente || erro.pagina || "Aplicação"}</p><p className="text-xs text-muted-foreground">{erro.operacao || erro.categoria}{erro.codigo_http ? ` · HTTP ${erro.codigo_http}` : ""}</p></td>
                    <td className="max-w-md p-3"><p className="line-clamp-2">{erro.mensagem}</p><p className="truncate text-xs text-muted-foreground">{erro.endpoint}</p></td>
                    <td className="whitespace-nowrap p-3 text-muted-foreground">{erro.navegador} · {erro.sistema_operacional}</td>
                    <td className="p-3 text-right font-semibold">{erro.ocorrencias}</td>
                    <td className="whitespace-nowrap p-3 text-right">
                      {erro.status === "pendente" ? (
                        <Button size="icon" variant="ghost" title="Marcar como resolvido" aria-label="Marcar como resolvido" onClick={() => atualizar.mutate({ id: erro.id, resolvido: true })}>
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" title="Reabrir diagnóstico" aria-label="Reabrir diagnóstico" onClick={() => atualizar.mutate({ id: erro.id, resolvido: false })}>
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" title="Remover item resolvido" aria-label="Remover item resolvido" onClick={() => setArquivar(erro.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <AlertDialog open={arquivar !== null} onOpenChange={(aberto) => !aberto && setArquivar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{arquivar === "todos" ? "Limpar itens resolvidos?" : "Remover item resolvido?"}</AlertDialogTitle>
            <AlertDialogDescription>Os diagnósticos serão arquivados e sairão da lista, sem apagar dados operacionais.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => arquivar && limpar.mutate(arquivar)}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Indicador({ icone: Icone, rotulo, valor }: { icone: typeof Activity; rotulo: string; valor: number }) {
  return <div className="surface-panel flex items-center gap-3 p-4"><Icone className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">{rotulo}</p><p className="font-display text-xl font-bold">{valor}</p></div></div>;
}
function PaginaProtegida() {
  return (
    <RequerAdmin area="Saúde do Sistema">
      <Pagina />
    </RequerAdmin>
  );
}
