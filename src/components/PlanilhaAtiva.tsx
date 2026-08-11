import { Link } from "@tanstack/react-router";
import { FileSpreadsheet, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { usePlanilhaAtiva, useRetirarPlanilha } from "@/lib/dados";
import { fmtData, fmtNum } from "@/lib/metricas";

/** Estado exibido quando não há planilha ativa no sistema. */
export function SemPlanilha({ pagina }: { pagina?: string }) {
  return (
    <div className="surface-panel filete-ouro mx-auto mt-12 max-w-xl rounded-2xl p-10 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-gold/25 bg-gold-soft text-accent-foreground">
        <FileSpreadsheet className="h-6 w-6" strokeWidth={1.75} />
      </span>
      <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">
        Nenhuma planilha carregada.
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {pagina ? `${pagina} usa os dados da planilha ativa. ` : ""}
        Importe uma planilha Excel para alimentar todas as abas do sistema.
      </p>
      <Button asChild className="mt-6">
        <Link to="/importar">
          <Upload className="mr-2 h-4 w-4" /> Importar planilha
        </Link>
      </Button>
    </div>
  );
}

/** Faixa com a planilha ativa e a opção de retirá-la. */
export function PlanilhaAtivaBanner() {
  const { data: ativa } = usePlanilhaAtiva();
  const retirar = useRetirarPlanilha();

  if (!ativa) return null;

  return (
    <div className="surface-panel grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl p-4 sm:flex sm:flex-wrap sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
          <FileSpreadsheet className="h-4.5 w-4.5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Planilha ativa: {ativa.nome_arquivo}</p>
          <p className="text-xs text-muted-foreground">
            {fmtNum(ativa.registros)} registros alimentando todo o sistema
            {ativa.data_importacao ? ` · importada em ${fmtData(ativa.data_importacao)}` : ""}
          </p>
        </div>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" disabled={retirar.isPending}>
            <Trash2 className="mr-2 h-4 w-4" />
            {retirar.isPending ? "Retirando..." : "Retirar planilha"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirar a planilha ativa?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os dados desta planilha serão removidos do sistema e todas as abas voltarão ao
              estado "Nenhuma planilha carregada."
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                retirar.mutate(undefined, {
                  onSuccess: () => toast.success("Planilha retirada. Nenhuma planilha carregada."),
                  onError: (e) => toast.error(`Falha ao retirar: ${(e as Error).message}`),
                })
              }
            >
              Retirar planilha
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
