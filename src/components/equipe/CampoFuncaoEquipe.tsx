import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { normalizarNomeFuncao, useFuncoes, useSalvarFuncao } from "@/lib/funcoes";

interface Props {
  /** Função atualmente vinculada ao colaborador (id) ou null. */
  value: string | null;
  onChange: (funcaoId: string | null) => void;
  id?: string;
  className?: string;
  /** Exibe o botão "+ Criar função" ao lado do campo. */
  podeCriar?: boolean;
}

/**
 * Seleção da função exercida pelo colaborador que tem acesso ao Recruta+.
 * Só lista funções ativas, mas mantém visível a função histórica já vinculada.
 * Não tem relação com as funções/vagas de recrutamento.
 */
export function CampoFuncaoEquipe({ value, onChange, id, className, podeCriar = true }: Props) {
  const { data: funcoes = [] } = useFuncoes();
  const salvar = useSalvarFuncao();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  const atual = funcoes.find((f) => f.id === value);
  const opcoes = funcoes.filter((f) => f.ativo || f.id === value);

  async function criar() {
    try {
      await salvar.mutateAsync({ nome, descricao });
      setNome("");
      setDescricao("");
      setAberto(false);
      toast.success("Função criada. Configure os acessos em Perfis e Permissões.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="flex items-end gap-2">
      <Select
        value={value ?? "nenhuma"}
        onValueChange={(v) => onChange(v === "nenhuma" ? null : v)}
      >
        <SelectTrigger id={id} className={className ?? "h-9 w-48"}>
          <SelectValue placeholder="Selecione a função">
            {atual ? `${atual.nome}${atual.ativo ? "" : " (inativa)"}` : "Sem função"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="nenhuma">Sem função</SelectItem>
          {opcoes.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {f.nome}
              {f.ativo ? "" : " (inativa)"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {podeCriar && (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            title="Criar função"
            aria-label="Criar função da equipe"
            onClick={() => setAberto(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>

          <Dialog open={aberto} onOpenChange={setAberto}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Criar função da equipe</DialogTitle>
                <DialogDescription>
                  Ex.: Atendimento, Faturamento, Financeiro, Coordenação. Um perfil com o mesmo nome
                  é criado automaticamente em Perfis e Permissões para configurar os acessos.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cf-nome">Nome da função</Label>
                  <Input
                    id="cf-nome"
                    value={nome}
                    maxLength={80}
                    placeholder="Ex.: ATENDIMENTO"
                    onChange={(e) => setNome(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cf-desc">Descrição (opcional)</Label>
                  <Textarea
                    id="cf-desc"
                    value={descricao}
                    maxLength={200}
                    onChange={(e) => setDescricao(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAberto(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => void criar()}
                  disabled={salvar.isPending || normalizarNomeFuncao(nome).length < 2}
                >
                  Criar função
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
