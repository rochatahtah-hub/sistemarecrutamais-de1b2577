import { useState } from "react";
import { Briefcase, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useCargosCLT, useExcluirCargoCLT, useSalvarCargoCLT } from "@/lib/rs";

/** Cadastro e manutenção dos cargos CLT usados no módulo de R&S. */
export function GerenciarCargosRS() {
  const { data: cargos = [] } = useCargosCLT();
  const salvar = useSalvarCargoCLT();
  const excluir = useExcluirCargoCLT();
  const [novo, setNovo] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoNome, setEditandoNome] = useState("");

  async function criar() {
    if (!novo.trim()) return;
    try {
      await salvar.mutateAsync({ nome: novo });
      setNovo("");
      toast.success("Cargo cadastrado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível cadastrar o cargo.");
    }
  }

  async function renomear(id: string) {
    try {
      await salvar.mutateAsync({ id, nome: editandoNome });
      setEditandoId(null);
      toast.success("Cargo atualizado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar o cargo.");
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Briefcase className="mr-2 h-4 w-4" /> Cargos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cargos CLT</DialogTitle>
          <DialogDescription>
            Cadastre, renomeie, desative ou exclua os cargos usados nos candidatos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            placeholder="Novo cargo (ex.: Auxiliar de Produção)"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void criar();
              }
            }}
          />
          <Button onClick={() => void criar()} disabled={salvar.isPending || !novo.trim()}>
            <Plus className="mr-2 h-4 w-4" /> Cadastrar
          </Button>
        </div>

        <div className="max-h-[50vh] space-y-1.5 overflow-y-auto pr-1">
          {cargos.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum cargo cadastrado.</p>
          )}
          {cargos.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2"
            >
              {editandoId === c.id ? (
                <>
                  <Input
                    value={editandoNome}
                    onChange={(e) => setEditandoNome(e.target.value)}
                    className="h-8 flex-1"
                  />
                  <Button size="icon" variant="ghost" aria-label="Salvar nome do cargo" title="Salvar" onClick={() => void renomear(c.id)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Cancelar edição do cargo" title="Cancelar" onClick={() => setEditandoId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className={`flex-1 truncate text-sm ${c.ativo ? "" : "text-muted-foreground line-through"}`}>
                    {c.nome}
                  </span>
                  <Switch
                    checked={c.ativo}
                    onCheckedChange={(v) =>
                      salvar.mutate(
                        { id: c.id, nome: c.nome, ativo: v },
                        { onError: () => toast.error("Não foi possível atualizar.") },
                      )
                    }
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Editar o cargo ${c.nome}`}
                    title="Editar cargo"
                    onClick={() => {
                      setEditandoId(c.id);
                      setEditandoNome(c.nome);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Excluir o cargo ${c.nome}`}
                    title="Excluir cargo"
                    onClick={() =>
                      excluir.mutate(c.id, {
                        onSuccess: () => toast.success("Cargo excluído."),
                        onError: () => toast.error("Não foi possível excluir o cargo."),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
