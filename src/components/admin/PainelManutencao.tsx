import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { sincronizarSistema } from "@/lib/sincronizar";

/** Verificação de integridade: nunca altera dados, apenas aponta problemas. */
export function useIntegridade() {
  return useQuery({
    queryKey: ["admin-integridade"],
    queryFn: async () => {
      const [candidatos, vagas] = await Promise.all([
        supabase.from("candidatos").select("id,nome,cpf"),
        supabase.from("vagas").select("id,data,situacao,empresa_id,colaborador_id,candidato_id"),
      ]);
      if (candidatos.error) throw candidatos.error;
      if (vagas.error) throw vagas.error;

      const listaC = candidatos.data ?? [];
      const listaV = vagas.data ?? [];
      const porCpf = new Map<string, number>();
      for (const c of listaC) porCpf.set(c.cpf, (porCpf.get(c.cpf) ?? 0) + 1);

      return [
        { rotulo: "CPF inválido ou incompleto", qtd: listaC.filter((c) => (c.cpf ?? "").replace(/\D/g, "").length !== 11).length },
        { rotulo: "Colaboradores duplicados (mesmo CPF)", qtd: [...porCpf.values()].filter((n) => n > 1).length },
        { rotulo: "Colaboradores sem nome", qtd: listaC.filter((c) => !c.nome?.trim()).length },
        { rotulo: "Programações sem empresa", qtd: listaV.filter((v) => !v.empresa_id).length },
        { rotulo: "Programações sem colaborador", qtd: listaV.filter((v) => !v.colaborador_id && !v.candidato_id).length },
        { rotulo: "Registros sem data", qtd: listaV.filter((v) => !v.data).length },
        { rotulo: "Registros sem situação", qtd: listaV.filter((v) => !v.situacao).length },
      ];
    },
    staleTime: 60_000,
  });
}

export function PainelManutencao() {
  const qc = useQueryClient();
  const { data: itens = [], isLoading, refetch } = useIntegridade();
  const [confirmar, setConfirmar] = useState<{ titulo: string; texto: string; acao: () => void } | null>(null);

  const problemas = itens.reduce((s, i) => s + i.qtd, 0);

  const acoes = [
    {
      titulo: "Sincronizar informações",
      texto: "Recarrega Dashboard, rankings, relatórios e indicadores a partir do banco.",
      executar: () => {
        sincronizarSistema(qc);
        toast.success("Sistema sincronizado.");
      },
    },
    {
      titulo: "Recalcular indicadores",
      texto: "Refaz os cálculos de presença, falta, cancelamento e metas.",
      executar: () => {
        void qc.invalidateQueries({ queryKey: ["vagas"] });
        sincronizarSistema(qc);
        toast.success("Indicadores recalculados.");
      },
    },
    {
      titulo: "Verificar integridade da base",
      texto: "Procura registros incompletos, duplicados e inconsistências. Não altera dados.",
      executar: () => {
        void refetch();
        toast.success("Verificação executada.");
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="surface-panel space-y-3 rounded-xl p-4">
        <div className="flex items-center gap-2">
          {problemas === 0 ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          )}
          <h3 className="font-display text-sm font-semibold">
            Integridade dos dados — {problemas === 0 ? "🟢 nenhum problema" : `🟡 ${problemas} ponto(s) de atenção`}
          </h3>
        </div>
        {isLoading && <Skeleton className="h-32 w-full" />}
        <div className="grid gap-2 sm:grid-cols-2">
          {itens.map((i) => (
            <div
              key={i.rotulo}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground">{i.rotulo}</span>
              <span className={i.qtd > 0 ? "font-semibold text-amber-500" : "font-semibold text-emerald-500"}>
                {i.qtd}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {acoes.map((a) => (
          <div key={a.titulo} className="surface-panel flex flex-col gap-2 rounded-xl p-4">
            <h4 className="font-display text-sm font-semibold">{a.titulo}</h4>
            <p className="flex-1 text-xs text-muted-foreground">{a.texto}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmar({ titulo: a.titulo, texto: a.texto, acao: a.executar })}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Executar
            </Button>
          </div>
        ))}
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4" /> Nenhuma ação de manutenção apaga dados. Operações destrutivas não são
        permitidas por esta central.
      </p>

      <AlertDialog open={Boolean(confirmar)} onOpenChange={(o) => !o && setConfirmar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmar?.titulo}</AlertDialogTitle>
            <AlertDialogDescription>{confirmar?.texto} Deseja continuar?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmar?.acao();
                setConfirmar(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}