import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Database, FileSpreadsheet, FileText, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { listarErrosSistema } from "@/lib/system-health";
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
  component: Pagina,
});

function Pagina() {
  const { isAdmin } = useAuth();
  const consulta = useQuery({
    queryKey: ["saude-sistema"],
    queryFn: listarErrosSistema,
    enabled: isAdmin,
    refetchInterval: 60_000,
    retry: false,
  });
  const erros = consulta.data ?? [];
  const [exportando, setExportando] = useState<"pdf" | "excel" | null>(null);
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
      <div className="surface-panel overflow-hidden">
        {consulta.isPending ? (
          <p className="p-5 text-sm text-muted-foreground">Carregando diagnósticos...</p>
        ) : consulta.isError ? (
          <div className="flex items-center gap-2 p-5 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> Não foi possível consultar os diagnósticos.
          </div>
        ) : erros.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Nenhuma falha registrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
                <tr><th className="p-3">Última ocorrência</th><th className="p-3">Origem</th><th className="p-3">Falha</th><th className="p-3">Ambiente</th><th className="p-3 text-right">Total</th></tr>
              </thead>
              <tbody>
                {erros.map((erro) => (
                  <tr key={erro.id} className="border-b last:border-0">
                    <td className="whitespace-nowrap p-3">{new Date(erro.ultima_ocorrencia).toLocaleString("pt-BR")}</td>
                    <td className="p-3"><p className="font-medium">{erro.componente || erro.pagina || "Aplicação"}</p><p className="text-xs text-muted-foreground">{erro.operacao || erro.categoria}{erro.codigo_http ? ` · HTTP ${erro.codigo_http}` : ""}</p></td>
                    <td className="max-w-md p-3"><p className="line-clamp-2">{erro.mensagem}</p><p className="truncate text-xs text-muted-foreground">{erro.endpoint}</p></td>
                    <td className="whitespace-nowrap p-3 text-muted-foreground">{erro.navegador} · {erro.sistema_operacional}</td>
                    <td className="p-3 text-right font-semibold">{erro.ocorrencias}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Indicador({ icone: Icone, rotulo, valor }: { icone: typeof Activity; rotulo: string; valor: number }) {
  return <div className="surface-panel flex items-center gap-3 p-4"><Icone className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">{rotulo}</p><p className="font-display text-xl font-bold">{valor}</p></div></div>;
}