import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  normalizarNomeFuncao,
  useExcluirFuncao,
  useFuncoes,
  useSalvarFuncao,
} from "@/lib/funcoes";

/**
 * Cadastro de funções (ATENDIMENTO, FINANCEIRO, FATURAMENTO...) usadas na
 * programação. Funções inativas somem dos novos cadastros mas permanecem no
 * histórico dos registros antigos.
 */
export function PainelFuncoes() {
  const { data: funcoes = [], isPending } = useFuncoes();
  const salvar = useSalvarFuncao();
  const excluir = useExcluirFuncao();
  const [nova, setNova] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoNome, setEditandoNome] = useState("");

  async function criar() {
    if (!normalizarNomeFuncao(nova)) return;
    try {
      await salvar.mutateAsync({ nome: nova });
      setNova("");
      toast.success("Função cadastrada.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function renomear(id: string) {
    try {
      await salvar.mutateAsync({ id, nome: editandoNome });
      setEditandoId(null);
      toast.success("Função atualizada.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funções / cargos da equipe</CardTitle>
        <CardDescription>
          Cadastre, renomeie, ative ou inative funções da equipe (Programação, Coordenação,
          Atendimento, Financeiro, Faturamento...). As inativas não aparecem em novas atribuições,
          mas continuam visíveis nos registros históricos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Input
            value={nova}
            className="max-w-xs"
            maxLength={80}
            placeholder="Nova função (ex.: ATENDIMENTO)"
            onChange={(e) => setNova(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void criar();
              }
            }}
          />
          <Button onClick={() => void criar()} disabled={salvar.isPending || !nova.trim()}>
            <Plus className="mr-2 h-4 w-4" /> Cadastrar
          </Button>
        </div>

        <div className="space-y-1.5">
          {isPending && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {!isPending && funcoes.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma função cadastrada.
            </p>
          )}
          {funcoes.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2"
            >
              {editandoId === f.id ? (
                <>
                  <Input
                    value={editandoNome}
                    className="h-8 flex-1"
                    maxLength={80}
                    onChange={(e) => setEditandoNome(e.target.value)}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Salvar"
                    aria-label="Salvar nome da função"
                    onClick={() => void renomear(f.id)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Cancelar"
                    aria-label="Cancelar edição da função"
                    onClick={() => setEditandoId(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span
                    className={`flex-1 truncate text-sm ${f.ativo ? "" : "text-muted-foreground line-through"}`}
                  >
                    {f.nome}
                  </span>
                  <Switch
                    checked={f.ativo}
                    aria-label={`Ativar ou inativar a função ${f.nome}`}
                    onCheckedChange={(v) =>
                      salvar.mutate(
                        { id: f.id, ativo: v },
                        { onError: () => toast.error("Não foi possível atualizar.") },
                      )
                    }
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Excluir função"
                    aria-label={`Excluir a função ${f.nome}`}
                    disabled={excluir.isPending}
                    onClick={() => {
                      if (!window.confirm(`Excluir a função ${f.nome}?`)) return;
                      excluir.mutate(f.id, {
                        onSuccess: () => toast.success("Função excluída."),
                        onError: (e) => toast.error((e as Error).message),
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Editar função"
                    aria-label={`Editar a função ${f.nome}`}
                    onClick={() => {
                      setEditandoId(f.id);
                      setEditandoNome(f.nome);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
