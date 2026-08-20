import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Pencil, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  normalizarNomeFuncao,
  useExcluirFuncao,
  useFuncoes,
  useSalvarFuncao,
} from "@/lib/funcoes";

/**
 * Cadastro de funções da equipe (Programador, Coordenador, Financeiro...).
 * Cada função criada gera automaticamente um perfil correspondente em
 * Configurações → Perfis e Permissões, onde as permissões são configuradas.
 * Funções inativas somem dos novos cadastros mas permanecem no histórico.
 */
export function PainelFuncoes() {
  const { data: funcoes = [], isPending } = useFuncoes();
  const salvar = useSalvarFuncao();
  const excluir = useExcluirFuncao();
  const [aberto, setAberto] = useState(false);
  const [nova, setNova] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novaAtiva, setNovaAtiva] = useState(true);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoNome, setEditandoNome] = useState("");

  async function criar() {
    if (!normalizarNomeFuncao(nova)) return;
    try {
      await salvar.mutateAsync({ nome: nova, descricao: novaDescricao, ativo: novaAtiva });
      setNova("");
      setNovaDescricao("");
      setNovaAtiva(true);
      setAberto(false);
      toast.success("Função cadastrada. O perfil correspondente já está em Perfis e Permissões.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function renomear(id: string) {
    try {
      await salvar.mutateAsync({ id, nome: editandoNome });
      setEditandoId(null);
      toast.success("Função e perfil atualizados.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funções / cargos da equipe</CardTitle>
        <CardDescription>
          Cada função criada aqui gera automaticamente um perfil com o mesmo nome em{" "}
          <Link to="/perfis" className="underline">
            Perfis e Permissões
          </Link>
          , onde você define o que aquele perfil pode ver e fazer. Funções inativas não aparecem em
          novas atribuições, mas o histórico e o perfil são preservados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Criar nova função
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova função da equipe</DialogTitle>
              <DialogDescription>
                Ex.: Programador, Coordenador, Supervisor, Recrutador, Financeiro, Atendimento. Um
                perfil com esse nome será criado automaticamente em Perfis e Permissões.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-nome">Nome da função</Label>
                <Input
                  id="f-nome"
                  value={nova}
                  maxLength={80}
                  placeholder="Ex.: COORDENADOR DE RECRUTAMENTO"
                  onChange={(e) => setNova(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-desc">Descrição (opcional)</Label>
                <Textarea
                  id="f-desc"
                  value={novaDescricao}
                  maxLength={200}
                  onChange={(e) => setNovaDescricao(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch
                  checked={novaAtiva}
                  aria-label="Status da nova função"
                  onCheckedChange={setNovaAtiva}
                />
                {novaAtiva ? "Ativa" : "Inativa"}
              </label>
            </div>
            <DialogFooter>
              <Button
                onClick={() => void criar()}
                disabled={salvar.isPending || normalizarNomeFuncao(nova).length < 2}
              >
                Criar função e perfil
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm ${f.ativo ? "" : "text-muted-foreground line-through"}`}
                    >
                      {f.nome}
                    </p>
                    {f.descricao && (
                      <p className="truncate text-xs text-muted-foreground">{f.descricao}</p>
                    )}
                  </div>
                  {f.perfil_id && (
                    <Badge variant="outline" className="shrink-0 gap-1 text-[10px]">
                      <ShieldCheck className="h-3 w-3" /> Perfil vinculado
                    </Badge>
                  )}
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
