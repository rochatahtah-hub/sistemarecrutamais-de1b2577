import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ShieldOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/use-debounce";
import { useBloqueados, useBloquearColaborador, useDesbloquearColaborador } from "@/lib/bloqueios";
import { useCandidatos } from "@/lib/programacao";
import { usePrivacidade } from "@/lib/privacidade";

export function PainelColaboradores() {
  const p = usePrivacidade();
  const [busca, setBusca] = useState("");
  const termo = useDebounce(busca, 350);
  const { data: candidatos = [], isLoading } = useCandidatos(termo);
  const { data: bloqueados = [] } = useBloqueados("");
  const bloquear = useBloquearColaborador();
  const desbloquear = useDesbloquearColaborador();
  const [alvo, setAlvo] = useState<{ cpf: string; nome: string; motivo: string } | null>(null);

  const historico = useQuery({
    queryKey: ["admin-historico-colab", alvo?.cpf ?? ""],
    enabled: false,
    queryFn: async () => [] as unknown[],
  });
  void historico;

  const bloqueioDe = (cpf: string) => bloqueados.find((b) => b.cpf === cpf.replace(/\D/g, ""));

  return (
    <div className="space-y-4">
      <div className="surface-panel flex items-center gap-2 rounded-xl p-4">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar por nome ou CPF"
        />
      </div>

      {isLoading && <Skeleton className="h-40 w-full" />}

      <div className="space-y-2">
        {candidatos.map((c) => {
          const bloqueio = bloqueioDe(c.cpf);
          return (
            <div
              key={c.id}
              className="surface-panel flex flex-wrap items-center justify-between gap-3 rounded-xl p-4"
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  {p.nome(c.nome)}
                  {bloqueio && <Badge variant="destructive">Bloqueado</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">
                  CPF {p.cpf(c.cpf)} · Tel {p.telefone(c.telefone ?? "")}
                </p>
                {bloqueio && (
                  <p className="text-xs text-destructive">Motivo: {bloqueio.motivo}</p>
                )}
              </div>
              {bloqueio ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    desbloquear.mutate(bloqueio.id, {
                      onSuccess: () => toast.success("Colaborador desbloqueado."),
                      onError: (e) => toast.error(e.message),
                    })
                  }
                >
                  <ShieldCheck className="mr-2 h-4 w-4" /> Desbloquear
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setAlvo({ cpf: c.cpf, nome: c.nome, motivo: "" })}
                >
                  <ShieldOff className="mr-2 h-4 w-4" /> Bloquear
                </Button>
              )}
            </div>
          );
        })}
        {!isLoading && candidatos.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum colaborador encontrado.</p>
        )}
      </div>

      <Dialog open={Boolean(alvo)} onOpenChange={(o) => !o && setAlvo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bloquear {alvo?.nome}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Motivo do bloqueio"
            value={alvo?.motivo ?? ""}
            onChange={(e) => setAlvo((s) => (s ? { ...s, motivo: e.target.value } : s))}
          />
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={bloquear.isPending}
              onClick={() =>
                alvo &&
                bloquear.mutate(alvo, {
                  onSuccess: () => {
                    toast.success("Colaborador bloqueado.");
                    setAlvo(null);
                  },
                  onError: (e) => toast.error(e.message),
                })
              }
            >
              Confirmar bloqueio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}